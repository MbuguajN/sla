"use server";

import { db } from "@/lib/db";
import { getCurrentUser, canManageLeaves, canViewHRData, canViewSuggestions, DEPARTMENTS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
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

  const policyCandidates = await db.leavePolicy.findMany({
    where: {
      role: userRole,
      leaveType: data.type,
    },
    orderBy: { leaveType: "asc" },
  });

  const leavePolicy = policyCandidates.find((policy) => policy.leaveType === data.type) ?? null;

  if (!leavePolicy) {
    throw new Error("This leave type is not configured for your role");
  }

  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const consumed = await db.leave.aggregate({
    where: {
      userId: user.id,
      type: data.type,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: {
        gte: yearStart,
        lte: yearEnd,
      },
    },
    _sum: {
      totalDays: true,
    },
  });

  const usedDays = consumed._sum.totalDays ?? 0;
  const remainingDays = Math.max(leavePolicy.daysAllowed - usedDays, 0);

  if (totalDays > remainingDays) {
    throw new Error(
      `Requested ${totalDays} day(s), but only ${remainingDays} day(s) remain for ${getLeaveTypeLabel(data.type)}`
    );
  }

  const validatedHandovers = await validateLeaveHandoversForUser(
    user,
    data.handovers,
    toUtcDateTime(start, getLeaveTimeWindow(data.duration).startHour),
    toUtcDateTime(end, getLeaveTimeWindow(data.duration).endHour)
  );

  const { startHour, endHour } = getLeaveTimeWindow(data.duration);
  const leaveStartDateTime = toUtcDateTime(start, startHour);
  const leaveEndDateTime = toUtcDateTime(end, endHour);

  const leave = await db.leave.create({
    data: {
      userId: user.id,
      type: data.type,
      duration: data.duration,
      startDate: leaveStartDateTime,
      endDate: leaveEndDateTime,
      totalDays,
      reason: data.reason,
      status: "PENDING",
    },
  });

  const managers = await db.user.findMany({
    where: {
      role: "MANAGER",
      isActive: true,
    },
    select: { id: true },
  });

  await Promise.allSettled(
    managers
      .filter((reviewer) => reviewer.id !== user.id)
      .map((reviewer) =>
        createNotification(
          reviewer.id,
          "REQUISITION_UPDATED",
          "New Leave Request",
          `${user.name} submitted a ${data.type.toLowerCase()} leave request for your review`,
          "/manager/leaves"
        )
      )
  );

  if (validatedHandovers.length > 0) {
    await db.leaveTaskHandover.createMany({
      data: validatedHandovers.map((handover) => ({
        leaveId: leave.id,
        taskId: handover.taskId,
        originalAssigneeId: user.id,
        delegateUserId: handover.delegateUserId,
        status: "PENDING_TRANSFER",
      })),
    });
  }

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

    const leave = await db.leave.findUnique({ where: { id: leaveId } });
    if (!leave) throw new Error("Leave not found");

    // Manager reviewing: advance to PENDING_HR (can only deny at this stage)
    if (user.role === "MANAGER") {
      if (leave.status !== "PENDING") throw new Error("Leave is not pending manager review");
      if (decision === "DENIED") {
        const updated = await db.leave.update({
          where: { id: leaveId },
          data: {
            status: "DENIED",
            reviewedBy: user.id,
            reviewNote: reviewNote || null,
          },
        });
        try {
          await createNotification(
            leave.userId,
            "LEAVE_DENIED",
            "Leave Denied",
            `Your leave request has been denied by your manager. ${reviewNote ? `Reason: ${reviewNote}` : ""}`,
            "/leave"
          );
        } catch (e) {
          console.error("Failed to create leave notification:", e);
        }
        revalidatePath("/leave");
        revalidatePath("/hr/leaves");
        revalidatePath("/manager/leaves");
        return { ok: true, id: updated.id, status: updated.status };
      }
      // Manager approves → advance to PENDING_HR
      const updated = await db.leave.update({
        where: { id: leaveId },
        data: {
          status: "PENDING_HR",
          reviewNote: reviewNote || null,
        },
      });
      // Notify HR reviewers
      const hrReviewers = await db.user.findMany({
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
        hrReviewers.map((reviewer) =>
          createNotification(
            reviewer.id,
            "REQUISITION_UPDATED",
            "Leave Pending HR Approval",
            `A leave request has been approved by the manager and is pending your approval`,
            "/hr/leaves"
          )
        )
      );
      try {
        await createNotification(
          leave.userId,
          "REQUISITION_UPDATED",
          "Leave Forwarded to HR",
          `Your leave request has been approved by your manager and is now pending HR approval`,
          "/leave"
        );
      } catch (e) {
        console.error("Failed to create leave notification:", e);
      }
      revalidatePath("/leave");
      revalidatePath("/hr/leaves");
      revalidatePath("/manager/leaves");
      return { ok: true, id: updated.id, status: updated.status };
    }

    // HR/Admin reviewing: must be PENDING or PENDING_HR
    if (leave.status !== "PENDING_HR" && leave.status !== "PENDING") throw new Error("Leave is not pending HR review");

    const updated = await db.leave.update({
      where: { id: leaveId },
      data: {
        status: decision,
        reviewedBy: user.id,
        reviewNote: reviewNote || null,
      },
    });

    const notificationType = decision === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_DENIED";
    const message = decision === "APPROVED"
      ? `Your leave request has been approved by HR`
      : `Your leave request has been denied by HR. ${reviewNote ? `Reason: ${reviewNote}` : ""}`;

    try {
      await createNotification(
        leave.userId,
        notificationType,
        `Leave ${decision}`,
        message,
        "/leave"
      );
    } catch (e) {
      console.error("Failed to create leave notification:", e);
    }

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
    return { ok: true, id: updated.id, status: updated.status };
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
  if (![
    "PENDING",
    "APPROVED",
  ].includes(leave.status)) {
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
  if (leave.status !== "PENDING") throw new Error("Only pending leaves can be cancelled");

  const updated = await db.leave.update({
    where: { id: leaveId },
    data: { status: "CANCELLED" },
  });

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
          "REQUISITION_UPDATED",
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
    "REQUISITION_UPDATED",
    "Suggestion Status Updated",
    `Your suggestion is now marked as ${status.replaceAll("_", " ").toLowerCase()}`,
    "/suggestions"
  );

  revalidatePath("/suggestions");
  revalidatePath("/hr/suggestions");
  return suggestion;
}
