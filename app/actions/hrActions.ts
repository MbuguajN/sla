"use server";

import { db } from "@/lib/db";
import {
  getCurrentUser,
  canManageLeaves,
  canApproveLeaveAsManager,
  canFinalizeLeaveAsHR,
  canViewHRData,
  canViewSuggestions,
  DEPARTMENTS,
} from "@/lib/permissions";
import { getLeaveEntitlements, getLeaveUsage } from "@/lib/leaveBalance";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { sendNotificationEmail } from "@/lib/email";
import {
  MODERN_LEAVE_TYPES,
  LEAVE_DURATIONS,
  getLeaveDayFactor,
  getLeaveTimeWindow,
  getLeaveTypeLabel,
  toUtcDateTime,
} from "@/lib/leave";

type LeavePolicyType = (typeof MODERN_LEAVE_TYPES)[number];
type LeaveDuration = (typeof LEAVE_DURATIONS)[number];

type LeaveHandoverInput = {
  taskId: number;
  delegateUserId: number;
};

function formatLeaveDate(value: Date) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type LeaveReviewer = { id: number; email: string | null };

/**
 * Fans a leave event out to reviewers as both an in-app notification and an
 * email, in one pass.
 *
 * Previously each site queried the reviewer list twice (once for ids, once for
 * emails) and tagged every non-final notification as REQUISITION_UPDATED, so
 * "New Leave Request" arrived in the bell typed as a requisition update.
 * Delivery stays best-effort: a dead mail server must not fail the action.
 */
async function notifyLeaveReviewers(
  reviewers: LeaveReviewer[],
  type: string,
  title: string,
  message: string,
  emailBody: string,
  emailSubject: string,
  link: string
) {
  if (reviewers.length === 0) return;

  await Promise.allSettled([
    ...reviewers.map((reviewer) =>
      createNotification(reviewer.id, type, title, message, link)
    ),
    ...reviewers
      .filter((reviewer) => Boolean(reviewer.email))
      .map((reviewer) =>
        sendNotificationEmail(reviewer.email as string, emailSubject, title, emailBody, link)
      ),
  ]);
}

async function validateLeaveHandoversForUser(
  user: { id: number; departmentId: number | null },
  handovers: LeaveHandoverInput[] | undefined,
  startDate: Date,
  endDate: Date,
  excludeLeaveId?: number
) {
  if (!handovers || handovers.length === 0) return [] as LeaveHandoverInput[];

  if (!user.departmentId) {
    throw new Error("You must belong to a department to configure task handovers");
  }

  const uniqueTaskIds = Array.from(new Set(handovers.map((h) => h.taskId)));
  if (uniqueTaskIds.length !== handovers.length) {
    throw new Error("Duplicate task handover entries are not allowed");
  }

  const taskIdSet = new Set(uniqueTaskIds);
  const tasks = await db.task.findMany({
    where: {
      id: { in: uniqueTaskIds },
      assignedUserId: user.id,
      status: { notIn: ["DONE", "CANCELLED"] },
    },
    select: { id: true },
  });

  if (tasks.length !== uniqueTaskIds.length) {
    throw new Error("Some selected tasks are not active tasks assigned to you");
  }

  const delegateIds = Array.from(new Set(handovers.map((h) => h.delegateUserId)));
  if (delegateIds.some((id) => id === user.id)) {
    throw new Error("You cannot hand over a task to yourself");
  }

  const delegates = await db.user.findMany({
    where: {
      id: { in: delegateIds },
      departmentId: user.departmentId,
      isActive: true,
    },
    select: { id: true, name: true },
  });

  if (delegates.length !== delegateIds.length) {
    throw new Error("Each task delegate must be an active teammate in your department");
  }

  for (const handover of handovers) {
    if (!taskIdSet.has(handover.taskId)) {
      throw new Error("Invalid task selected for handover");
    }

    const { hasApprovedLeaveOverlap } = await import("./leaveHandoverActions");
    const overlap = await hasApprovedLeaveOverlap(
      handover.delegateUserId,
      startDate,
      endDate,
      excludeLeaveId
    );

    if (overlap) {
      const delegate = delegates.find((item) => item.id === handover.delegateUserId);
      throw new Error(`${delegate?.name ?? "Selected delegate"} has overlapping approved leave in this period`);
    }
  }

  return handovers;
}

// ============== LEAVE MANAGEMENT ==============

export async function getMyLeaves() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await (await import("./leaveHandoverActions")).processLeaveTaskHandovers();

  return db.leave.findMany({
    where: { userId: user.id },
    include: {
      handovers: {
        include: {
          task: { select: { id: true, title: true } },
          delegateUser: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllLeaves() {
  const user = await getCurrentUser();
  if (!user || !canManageLeaves(user)) throw new Error("Unauthorized");

  await (await import("./leaveHandoverActions")).processLeaveTaskHandovers();

  return db.leave.findMany({
    include: {
      user: { include: { department: true } },
      handovers: {
        include: {
          task: { select: { id: true, title: true } },
          delegateUser: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLeave(data: {
  type: LeavePolicyType;
  duration: LeaveDuration;
  startDate: string;
  endDate: string;
  reason: string;
  handovers?: LeaveHandoverInput[];
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid leave dates");
  }

  if (end < start) {
    throw new Error("End date cannot be before start date");
  }

  if (!MODERN_LEAVE_TYPES.includes(data.type)) {
    throw new Error("Unsupported leave type");
  }

  if (!LEAVE_DURATIONS.includes(data.duration)) {
    throw new Error("Unsupported leave duration");
  }

  if (!["ANNUAL_LEAVE", "SICKNESS_LEAVE"].includes(data.type) && data.duration !== "FULL_DAY") {
    throw new Error("Half-day requests are only supported for annual and sickness leave");
  }

  // A half-day is half of ONE day. Without this, a Mon-Fri half-day request was
  // accepted and billed as 2.5 days, with a start/end time window that made no sense.
  if (data.duration !== "FULL_DAY" && start.getTime() !== end.getTime()) {
    throw new Error("Half-day leave must start and end on the same day");
  }

  // Fetch public holidays for exclusion
  const publicHolidays = await db.publicHoliday.findMany();
  const holidaySet = new Set(
    publicHolidays.map((h) => {
      const d = new Date(h.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  // Count working days only (Mon-Fri, excluding public holidays), with half-day support.
  const dayFactor = getLeaveDayFactor(data.duration);
  const cursor = new Date(start);
  let totalDays = 0;
  while (cursor <= end) {
    const day = cursor.getDay();
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (day !== 0 && day !== 6 && !holidaySet.has(key)) {
      totalDays += dayFactor;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (totalDays === 0) {
    throw new Error("Selected range falls entirely on weekends or public holidays");
  }

  const userRole = user.role as "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE";

  const [entitlements, usage] = await Promise.all([
    getLeaveEntitlements(user.id, userRole),
    getLeaveUsage(user.id),
  ]);

  const daysAllowed = entitlements.get(data.type);

  if (daysAllowed === undefined) {
    throw new Error("This leave type is not configured for your role");
  }

  const usedDays = usage.get(data.type) ?? 0;
  const remainingDays = Math.max(daysAllowed - usedDays, 0);

  if (totalDays > remainingDays) {
    throw new Error(
      `Requested ${totalDays} day(s), but only ${remainingDays} day(s) remain for ${getLeaveTypeLabel(data.type)}`
    );
  }

  const { startHour, endHour } = getLeaveTimeWindow(data.duration);
  const leaveStartUtc = toUtcDateTime(start, startHour);
  const leaveEndUtc = toUtcDateTime(end, endHour);

  // Overlap was only ever checked for delegates, never for the requester, so a
  // user could stack several requests covering the same dates.
  const overlapping = await db.leave.findFirst({
    where: {
      userId: user.id,
      status: { in: ["PENDING", "PENDING_HR", "APPROVED"] },
      startDate: { lte: leaveEndUtc },
      endDate: { gte: leaveStartUtc },
    },
    select: { id: true },
  });

  if (overlapping) {
    throw new Error("You already have a leave request covering these dates");
  }

  const validatedHandovers = await validateLeaveHandoversForUser(
    user,
    data.handovers,
    leaveStartUtc,
    leaveEndUtc
  );

  // General Staff skip the manager stage. So does anyone whose department has no
  // active manager to review them — otherwise the request sat in PENDING forever:
  // /hr/leaves filters PENDING out, and /manager/leaves needs a manager to exist.
  const isGeneralStaff = user.departmentSlug === DEPARTMENTS.GENERAL;

  const departmentManagers = user.departmentId
    ? await db.user.findMany({
        where: {
          role: "MANAGER",
          isActive: true,
          departmentId: user.departmentId,
          id: { not: user.id },
        },
        select: { id: true, email: true },
      })
    : [];

  const goesToManager = !isGeneralStaff && departmentManagers.length > 0;
  const initialStatus = goesToManager ? "PENDING" : "PENDING_HR";

  // Leave and its handovers are created together: a failure part-way through
  // previously left a leave with silently missing handovers.
  const leave = await db.$transaction(async (tx) => {
    const created = await tx.leave.create({
      data: {
        userId: user.id,
        type: data.type,
        duration: data.duration,
        startDate: leaveStartUtc,
        endDate: leaveEndUtc,
        totalDays,
        reason: data.reason,
        status: initialStatus,
      },
    });

    if (validatedHandovers.length > 0) {
      await tx.leaveTaskHandover.createMany({
        data: validatedHandovers.map((handover) => ({
          leaveId: created.id,
          taskId: handover.taskId,
          originalAssigneeId: user.id,
          delegateUserId: handover.delegateUserId,
          status: "PENDING_TRANSFER" as const,
        })),
      });
    }

    return created;
  });

  const leaveStartLabel = formatLeaveDate(leaveStartUtc);
  const leaveEndLabel = formatLeaveDate(leaveEndUtc);

  const reviewers = goesToManager
    ? departmentManagers
    : await db.user.findMany({
        where: {
          OR: [{ role: "ADMIN" }, { role: "CEO" }, { department: { slug: DEPARTMENTS.HR } }],
          isActive: true,
          id: { not: user.id },
        },
        select: { id: true, email: true },
      });

  const reviewLink = goesToManager ? "/manager/leaves" : "/hr/leaves";

  await notifyLeaveReviewers(
    reviewers,
    "LEAVE_SUBMITTED",
    "New Leave Request",
    `${user.name} submitted a ${getLeaveTypeLabel(data.type).toLowerCase()} request for your review`,
    `${user.name} has applied for leave from ${leaveStartLabel} to ${leaveEndLabel}. Please action this on Operations Control.`,
    `Leave Application — ${user.name}`,
    reviewLink
  );

  revalidatePath("/leave");
  revalidatePath("/hr/leaves");
  return leave;
}

export async function reviewLeave(
  leaveId: number,
  decision: "APPROVED" | "DENIED",
  reviewNote?: string
): Promise<{ ok: boolean; id?: number; status?: string; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageLeaves(user)) throw new Error("Unauthorized");

    const leave = await db.leave.findUnique({
      where: { id: leaveId },
      include: { user: { select: { id: true, name: true, email: true, departmentId: true } } },
    });
    if (!leave) throw new Error("Leave not found");

    const applicant = leave.user;

    // Which stage is this? A MANAGER may only act on their own department's
    // PENDING requests; only HR/CEO/ADMIN may take the final decision. Previously
    // canManageLeaves() alone gated both, so any manager could fall through into
    // the HR branch and finalise any employee's leave company-wide — and could
    // approve their own request, which appears on their own team list.
    const isManagerStage = leave.status === "PENDING";

    if (isManagerStage) {
      if (
        !canApproveLeaveAsManager(user, {
          userId: applicant.id,
          userDepartmentId: applicant.departmentId,
        })
      ) {
        throw new Error("Only a manager of this employee's department can review this request");
      }

      const nextStatus = decision === "DENIED" ? "DENIED" : "PENDING_HR";

      // Conditional update: two reviewers (or a double-click) could both pass the
      // status check above and both fire notifications.
      const applied = await db.leave.updateMany({
        where: { id: leaveId, status: "PENDING" },
        data: {
          status: nextStatus,
          managerReviewedBy: user.id,
          managerReviewNote: reviewNote || null,
          managerReviewedAt: new Date(),
          ...(decision === "DENIED" ? { reviewedBy: user.id, reviewNote: reviewNote || null } : {}),
        },
      });

      if (applied.count === 0) {
        throw new Error("This request has already been reviewed");
      }

      if (decision === "DENIED") {
        await Promise.allSettled([
          createNotification(
            applicant.id,
            "LEAVE_DENIED",
            "Leave Denied",
            `Your leave request has been denied by your manager.${reviewNote ? ` Reason: ${reviewNote}` : ""}`,
            "/leave"
          ),
          applicant.email
            ? sendNotificationEmail(
                applicant.email,
                "Leave Denied",
                "Leave Request Denied",
                `Hi ${applicant.name}, your leave request has been denied by your manager.${reviewNote ? ` Reason: ${reviewNote}` : ""}`,
                "/leave"
              )
            : Promise.resolve(),
        ]);
      } else {
        const hrReviewers = await db.user.findMany({
          where: {
            OR: [{ role: "ADMIN" }, { role: "CEO" }, { department: { slug: DEPARTMENTS.HR } }],
            isActive: true,
            id: { not: user.id },
          },
          select: { id: true, email: true },
        });

        await notifyLeaveReviewers(
          hrReviewers,
          "LEAVE_PENDING_HR",
          "Leave Pending HR Approval",
          `${applicant.name}'s leave was approved by their manager and is pending your approval`,
          `Leave applied by ${applicant.name} has been approved by the manager. Please action this on Operations Control.`,
          `Leave Approved by Manager — ${applicant.name}`,
          "/hr/leaves"
        );

        await Promise.allSettled([
          createNotification(
            applicant.id,
            "LEAVE_PENDING_HR",
            "Leave Forwarded to HR",
            "Your leave request has been approved by your manager and is now pending HR approval",
            "/leave"
          ),
        ]);
      }

      revalidatePath("/leave");
      revalidatePath("/hr/leaves");
      revalidatePath("/manager/leaves");
      return { ok: true, id: leaveId, status: nextStatus };
    }

    // ---- Final HR decision --------------------------------------------------
    if (leave.status !== "PENDING_HR") {
      throw new Error("Leave is not pending HR review. Only leaves approved by a manager can be reviewed by HR.");
    }

    if (!canFinalizeLeaveAsHR(user, { userId: applicant.id })) {
      throw new Error("Only HR can take the final decision on a leave request");
    }

    const applied = await db.leave.updateMany({
      where: { id: leaveId, status: "PENDING_HR" },
      data: {
        status: decision,
        reviewedBy: user.id,
        reviewNote: reviewNote || null,
      },
    });

    if (applied.count === 0) {
      throw new Error("This request has already been reviewed");
    }

    const message =
      decision === "APPROVED"
        ? "Your leave request has been approved by HR"
        : `Your leave request has been denied by HR.${reviewNote ? ` Reason: ${reviewNote}` : ""}`;

    await Promise.allSettled([
      createNotification(
        applicant.id,
        decision === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_DENIED",
        `Leave ${decision}`,
        message,
        "/leave"
      ),
      // The final decision previously sent no email at all, only an in-app bell.
      applicant.email
        ? sendNotificationEmail(
            applicant.email,
            `Leave ${decision === "APPROVED" ? "Approved" : "Denied"}`,
            `Leave Request ${decision === "APPROVED" ? "Approved" : "Denied"}`,
            `Hi ${applicant.name}, ${message.charAt(0).toLowerCase()}${message.slice(1)}`,
            "/leave"
          )
        : Promise.resolve(),
    ]);

    if (decision === "APPROVED") {
      try {
        await (await import("./leaveHandoverActions")).processLeaveTaskHandovers();
      } catch (e) {
        console.error("Failed to process leave task handovers:", e);
      }
    }

    revalidatePath("/leave");
    revalidatePath("/hr/leaves");
    revalidatePath("/manager/leaves");
    return { ok: true, id: leaveId, status: decision };
  } catch (error) {
    console.error("reviewLeave error:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

export async function updateLeaveHandovers(leaveId: number, handovers: LeaveHandoverInput[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const leave = await db.leave.findUnique({
    where: { id: leaveId },
    select: {
      id: true,
      userId: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!leave) throw new Error("Leave not found");
  if (leave.userId !== user.id) throw new Error("Unauthorized");
  if (!["PENDING", "PENDING_HR", "APPROVED"].includes(leave.status)) {
    throw new Error("Handover can only be edited for pending or approved leave");
  }

  if (new Date() >= leave.startDate) {
    throw new Error("Handover can only be edited before leave start date");
  }

  const validatedHandovers = await validateLeaveHandoversForUser(
    user,
    handovers,
    leave.startDate,
    leave.endDate,
    leave.id
  );

  await db.$transaction(async (tx) => {
    await tx.leaveTaskHandover.deleteMany({
      where: { leaveId },
    });

    if (validatedHandovers.length > 0) {
      await tx.leaveTaskHandover.createMany({
        data: validatedHandovers.map((handover) => ({
          leaveId,
          taskId: handover.taskId,
          originalAssigneeId: user.id,
          delegateUserId: handover.delegateUserId,
          status: "PENDING_TRANSFER",
        })),
      });
    }
  });

  revalidatePath("/leave");
  revalidatePath("/tasks");

  return { success: true };
}

export async function cancelLeave(leaveId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const leave = await db.leave.findUnique({ where: { id: leaveId } });
  if (!leave) throw new Error("Leave not found");
  if (leave.userId !== user.id) throw new Error("Unauthorized");
  if (leave.status !== "PENDING" && leave.status !== "PENDING_HR") throw new Error("Only pending leaves can be cancelled");

  const updated = await db.$transaction(async (tx) => {
    const cancelled = await tx.leave.update({
      where: { id: leaveId },
      data: { status: "CANCELLED" },
    });

    // Otherwise these sit at PENDING_TRANSFER forever and are rescanned on every read.
    await tx.leaveTaskHandover.updateMany({
      where: { leaveId, status: "PENDING_TRANSFER" },
      data: { status: "NOT_NEEDED" },
    });

    return cancelled;
  });

  // Notify whoever was holding the request, with a leave-specific type rather
  // than REQUISITION_UPDATED.
  const cancelMsg = `${user.name} has cancelled their ${getLeaveTypeLabel(leave.type).toLowerCase()} request`;

  const reviewers =
    leave.status === "PENDING"
      ? await db.user.findMany({
          where: { role: "MANAGER", isActive: true, departmentId: user.departmentId, id: { not: user.id } },
          select: { id: true, email: true },
        })
      : await db.user.findMany({
          where: {
            OR: [{ role: "ADMIN" }, { role: "CEO" }, { department: { slug: DEPARTMENTS.HR } }],
            isActive: true,
            id: { not: user.id },
          },
          select: { id: true, email: true },
        });

  const cancelLink = leave.status === "PENDING" ? "/manager/leaves" : "/hr/leaves";

  await notifyLeaveReviewers(
    reviewers,
    "LEAVE_CANCELLED",
    "Leave Cancelled",
    cancelMsg,
    `${cancelMsg}. No further action is needed.`,
    `Leave Cancelled — ${user.name}`,
    cancelLink
  );

  revalidatePath("/leave");
  revalidatePath("/hr/leaves");
  return updated;
}

// ============== LEAVE POLICY ==============

export async function getLeavePolicies() {
  const user = await getCurrentUser();
  if (!user || !canViewHRData(user)) throw new Error("Unauthorized");

  return db.leavePolicy.findMany({
    orderBy: [{ role: "asc" }, { leaveType: "asc" }],
  });
}

export async function upsertLeavePolicy(data: {
  role: "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE";
  leaveType: LeavePolicyType;
  daysAllowed: number;
}) {
  const user = await getCurrentUser();
  if (!user || !canViewHRData(user)) throw new Error("Unauthorized");

  const policy = await db.leavePolicy.upsert({
    where: { role_leaveType: { role: data.role, leaveType: data.leaveType } },
    update: { daysAllowed: data.daysAllowed },
    create: {
      role: data.role,
      leaveType: data.leaveType,
      daysAllowed: data.daysAllowed,
    },
  });

  revalidatePath("/hr/leave-policy");
  return policy;
}

export async function deleteLeavePolicy(data: {
  role: "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE";
  leaveType: LeavePolicyType;
}) {
  const user = await getCurrentUser();
  if (!user || !canViewHRData(user)) throw new Error("Unauthorized");

  await db.leavePolicy.delete({
    where: {
      role_leaveType: {
        role: data.role,
        leaveType: data.leaveType,
      },
    },
  });

  revalidatePath("/hr/leave-policy");
}

// ============== PUBLIC HOLIDAYS ==============

export async function getPublicHolidays() {
  return db.publicHoliday.findMany({
    orderBy: { date: "asc" },
  });
}

export async function addPublicHoliday(name: string, date: string) {
  const user = await getCurrentUser();
  if (!user || !canViewHRData(user)) throw new Error("Unauthorized");

  const holiday = await db.publicHoliday.create({
    data: {
      name,
      date: new Date(date),
    },
  });

  revalidatePath("/hr/leave-policy");
  return holiday;
}

export async function deletePublicHoliday(id: number) {
  const user = await getCurrentUser();
  if (!user || !canViewHRData(user)) throw new Error("Unauthorized");

  await db.publicHoliday.delete({ where: { id } });
  revalidatePath("/hr/leave-policy");
}

// ============== SUGGESTIONS ==============

export async function getMySuggestions() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return db.suggestion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllSuggestions() {
  const user = await getCurrentUser();
  if (!user || !canViewSuggestions(user)) throw new Error("Unauthorized");

  return db.suggestion.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSuggestion(data: {
  title: string;
  content: string;
  category: "COMPLAINT" | "SUGGESTION" | "FEEDBACK" | "REQUEST";
  isAnonymous: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const suggestion = await db.suggestion.create({
    data: {
      userId: user.id,
      title: data.title,
      content: data.content,
      category: data.category,
      isAnonymous: data.isAnonymous,
      status: "OPEN",
    },
  });

  const suggestionReviewers = await db.user.findMany({
    where: {
      OR: [
        { role: "ADMIN" },
        { role: "CEO" },
        { department: { slug: DEPARTMENTS.HR } },
      ],
      isActive: true,
    },
    select: { id: true },
  });

  await Promise.allSettled(
    suggestionReviewers
      .filter((reviewer) => reviewer.id !== user.id)
      .map((reviewer) =>
        createNotification(
          reviewer.id,
          "SUGGESTION_SUBMITTED",
          "New Suggestion Submitted",
          `A new ${data.category.toLowerCase()} suggestion is awaiting review`,
          "/hr/suggestions"
        )
      )
  );

  revalidatePath("/suggestions");
  revalidatePath("/hr/suggestions");
  return suggestion;
}

export async function reviewSuggestion(
  suggestionId: number,
  status: "IN_REVIEW" | "ACTIONED" | "CLOSED",
  hrNote?: string
) {
  const user = await getCurrentUser();
  if (!user || !canViewSuggestions(user)) throw new Error("Unauthorized");

  const suggestion = await db.suggestion.update({
    where: { id: suggestionId },
    data: {
      status,
      hrNote: hrNote || null,
    },
  });

  await createNotification(
    suggestion.userId,
    "SUGGESTION_UPDATED",
    "Suggestion Status Updated",
    `Your suggestion is now marked as ${status.replaceAll("_", " ").toLowerCase()}`,
    "/suggestions"
  );

  revalidatePath("/suggestions");
  revalidatePath("/hr/suggestions");
  return suggestion;
}
