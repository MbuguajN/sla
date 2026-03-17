"use server";

import { db } from "@/lib/db";
import { getCurrentUser, canManageLeaves, canViewHRData, canViewSuggestions } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";

// ============== LEAVE MANAGEMENT ==============

export async function getMyLeaves() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return db.leave.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllLeaves() {
  const user = await getCurrentUser();
  if (!user || !canManageLeaves(user)) throw new Error("Unauthorized");

  return db.leave.findMany({
    include: { user: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLeave(data: {
  type: "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY" | "UNPAID" | "COMPASSIONATE" | "OTHER";
  startDate: string;
  endDate: string;
  reason: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const leave = await db.leave.create({
    data: {
      userId: user.id,
      type: data.type,
      startDate: start,
      endDate: end,
      totalDays,
      reason: data.reason,
      status: "PENDING",
    },
  });

  revalidatePath("/leave");
  revalidatePath("/hr/leaves");
  return leave;
}

export async function reviewLeave(
  leaveId: number,
  decision: "APPROVED" | "DENIED",
  reviewNote?: string
) {
  const user = await getCurrentUser();
  if (!user || !canManageLeaves(user)) throw new Error("Unauthorized");

  const leave = await db.leave.findUnique({ where: { id: leaveId } });
  if (!leave) throw new Error("Leave not found");

  const updated = await db.leave.update({
    where: { id: leaveId },
    data: {
      status: decision,
      reviewedBy: user.id,
      reviewNote: reviewNote || null,
    },
  });

  // Create notification
  const notificationType = decision === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_DENIED";
  const message = decision === "APPROVED"
    ? `Your leave request has been approved`
    : `Your leave request has been denied`;

  await createNotification(
    leave.userId,
    notificationType,
    `Leave ${decision}`,
    message,
    "/leave"
  );

  revalidatePath("/leave");
  revalidatePath("/hr/leaves");
  return updated;
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
  leaveType: "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY" | "UNPAID" | "COMPASSIONATE" | "OTHER";
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

  revalidatePath("/suggestions");
  revalidatePath("/hr/suggestions");
  return suggestion;
}
