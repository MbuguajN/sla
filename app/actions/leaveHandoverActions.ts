import { db } from "@/lib/db";
import { createNotification } from "./notificationActions";

const prisma = db as any;

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function nextDay(date: Date): Date {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
}

export async function hasApprovedLeaveOverlap(
  userId: number,
  startDate: Date,
  endDate: Date,
  excludeLeaveId?: number
): Promise<boolean> {
  const normalizedStart = startOfDay(startDate);
  const normalizedEnd = startOfDay(endDate);

  const overlappingLeave = await db.leave.findFirst({
    where: {
      userId,
      status: "APPROVED",
      ...(excludeLeaveId ? { id: { not: excludeLeaveId } } : {}),
      startDate: { lte: normalizedEnd },
      endDate: { gte: normalizedStart },
    },
    select: { id: true },
  });

  return Boolean(overlappingLeave);
}

export async function isUserCurrentlyOnApprovedLeave(
  userId: number,
  now = new Date()
): Promise<{ startDate: Date; endDate: Date } | null> {
  const leave = await db.leave.findFirst({
    where: {
      userId,
      status: "APPROVED",
      startDate: { lte: now },
      endDate: { gte: startOfDay(now) },
    },
    select: {
      startDate: true,
      endDate: true,
    },
  });

  return leave;
}

async function processPendingTransfers(now: Date): Promise<{ transferred: number; skipped: number }> {
  const due = await prisma.leaveTaskHandover.findMany({
    where: {
      status: "PENDING_TRANSFER",
      leave: {
        status: "APPROVED",
        startDate: { lte: now },
      },
    },
    include: {
      leave: true,
      task: true,
      originalAssignee: true,
      delegateUser: true,
    },
    orderBy: { id: "asc" },
    take: 500,
  });

  let transferred = 0;
  let skipped = 0;

  for (const handover of due) {
    if (["DONE", "CANCELLED"].includes(handover.task.status)) {
      await prisma.leaveTaskHandover.update({
        where: { id: handover.id },
        data: { status: "NOT_NEEDED" },
      });
      skipped += 1;
      continue;
    }

    if (handover.task.assignedUserId !== handover.originalAssigneeId) {
      await prisma.leaveTaskHandover.update({
        where: { id: handover.id },
        data: { status: "NOT_NEEDED" },
      });
      skipped += 1;
      continue;
    }

    const delegateOnLeave = await hasApprovedLeaveOverlap(
      handover.delegateUserId,
      handover.leave.startDate,
      handover.leave.endDate
    );

    if (delegateOnLeave) {
      continue;
    }

    await db.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: handover.taskId },
        data: { assignedUserId: handover.delegateUserId },
      });

      await (tx as any).leaveTaskHandover.update({
        where: { id: handover.id },
        data: {
          status: "TRANSFERRED",
          transferredAt: now,
        },
      });

      await tx.activityLog.create({
        data: {
          type: "ASSIGNED",
          description: `Task handover activated for leave. Assigned to ${handover.delegateUser.name}`,
          taskId: handover.taskId,
          projectId: handover.task.projectId,
          userId: handover.originalAssigneeId,
        },
      });
    });

    await Promise.allSettled([
      createNotification(
        handover.delegateUserId,
        "TASK_ASSIGNED",
        "Task Handover Assigned",
        `${handover.originalAssignee.name} transferred task ${handover.task.title} to you for leave coverage`,
        `/tasks/${handover.taskId}`
      ),
      createNotification(
        handover.originalAssigneeId,
        "TASK_ASSIGNED",
        "Task Handover Started",
        `Task ${handover.task.title} has been transferred to ${handover.delegateUser.name}`,
        `/tasks/${handover.taskId}`
      ),
    ]);

    transferred += 1;
  }

  return { transferred, skipped };
}

async function processReturns(now: Date): Promise<{ returned: number; skipped: number }> {
  const due = await prisma.leaveTaskHandover.findMany({
    where: {
      status: "TRANSFERRED",
      leave: {
        status: "APPROVED",
      },
    },
    include: {
      leave: true,
      task: true,
      originalAssignee: true,
      delegateUser: true,
    },
    orderBy: { id: "asc" },
    take: 500,
  });

  let returned = 0;
  let skipped = 0;

  for (const handover of due) {
    const returnAt = nextDay(handover.leave.endDate);
    if (now < returnAt) {
      continue;
    }

    if (["DONE", "CANCELLED"].includes(handover.task.status)) {
      await prisma.leaveTaskHandover.update({
        where: { id: handover.id },
        data: { status: "NOT_NEEDED" },
      });
      skipped += 1;
      continue;
    }

    await db.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: handover.taskId },
        data: { assignedUserId: handover.originalAssigneeId },
      });

      await (tx as any).leaveTaskHandover.update({
        where: { id: handover.id },
        data: {
          status: "RETURNED",
          returnedAt: now,
        },
      });

      await tx.activityLog.create({
        data: {
          type: "ASSIGNED",
          description: `Task returned to ${handover.originalAssignee.name} after leave ended`,
          taskId: handover.taskId,
          projectId: handover.task.projectId,
          userId: handover.delegateUserId,
        },
      });
    });

    await Promise.allSettled([
      createNotification(
        handover.originalAssigneeId,
        "TASK_ASSIGNED",
        "Task Returned After Leave",
        `Task ${handover.task.title} has been returned to you after leave completion`,
        `/tasks/${handover.taskId}`
      ),
      createNotification(
        handover.delegateUserId,
        "TASK_ASSIGNED",
        "Task Handover Ended",
        `Task ${handover.task.title} has been returned to ${handover.originalAssignee.name}`,
        `/tasks/${handover.taskId}`
      ),
    ]);

    returned += 1;
  }

  return { returned, skipped };
}

export async function processLeaveTaskHandovers(
  now = new Date()
): Promise<{ transferred: number; returned: number; skipped: number }> {
  const transferResult = await processPendingTransfers(now);
  const returnResult = await processReturns(now);

  return {
    transferred: transferResult.transferred,
    returned: returnResult.returned,
    skipped: transferResult.skipped + returnResult.skipped,
  };
}
