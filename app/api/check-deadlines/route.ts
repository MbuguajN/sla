import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";
import { createNotification } from "@/app/actions/notificationActions";
import { TaskStatus } from "@prisma/client";

/**
 * POST /api/check-deadlines
 *
 * Cron endpoint — call hourly from an external service (e.g. cron-job.org).
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` header.
 *
 * Checks:
 *   1. Tasks with active status approaching/past SLA deadline
 *   2. Board cards with dueDate approaching/past
 *
 * Sends email + in-app notification to assigned users.
 * Includes a 2-hour dedup window to avoid repeated alerts.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let tasksChecked = 0;
  let tasksNotified = 0;
  let cardsChecked = 0;
  let cardsNotified = 0;

  try {
    // ── 1. TASKS — find active tasks with SLA deadline within next 24 hours or already past ──
    const activeTaskStatuses: TaskStatus[] = ["ASSIGNED", "CONFIRMED", "IN_PROGRESS", "SUBMITTED", "REVISION"];
    const tasks = await db.task.findMany({
      where: {
        assignedUserId: { not: null },
        status: { in: activeTaskStatuses },
        slaStartedAt: { not: null },
        slaHours: { not: null },
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { include: { client: true } },
      },
    });

    for (const task of tasks) {
      if (!task.slaStartedAt || !task.slaHours || !task.assignedTo) continue;
      tasksChecked++;

      // Calculate actual deadline accounting for paused duration
      const deadlineMs = task.slaStartedAt.getTime() + task.slaHours * 60 * 60 * 1000;
      const deadline = new Date(deadlineMs);
      const pausedMs = (task.slaPausedDuration || 0) * 60 * 60 * 1000;
      const adjustedDeadline = new Date(deadlineMs + pausedMs);

      // Only alert if within 24 hours of deadline (past or upcoming)
      const hoursUntilDeadline = (adjustedDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilDeadline > 24 || hoursUntilDeadline < -168) continue; // skip if >24h away or >7 days past

      // Determine urgency label
      let urgency: string;
      if (hoursUntilDeadline < 0) {
        urgency = `was due ${Math.round(Math.abs(hoursUntilDeadline))}h ago`;
      } else if (hoursUntilDeadline < 1) {
        urgency = "is due within the hour";
      } else {
        urgency = `is due in ${Math.round(hoursUntilDeadline)}h`;
      }

      const clientName = task.project?.client?.name || "a project";
      const notifTitle = `SLA ${hoursUntilDeadline < 0 ? "Overdue" : "Warning"}: ${task.title}`;
      const notifBody = `Task "${task.title}" in project "${clientName}" ${urgency}.`;

      // In-app notification
      await createNotification(
        task.assignedTo.id,
        "TASK_ASSIGNED",
        notifTitle,
        notifBody,
        `/tasks/${task.id}`
      );

      // Email
      if (task.assignedTo.email) {
        await sendNotificationEmail(
          task.assignedTo.email,
          notifTitle,
          notifTitle,
          `${notifBody}`,
          `/tasks/${task.id}`
        );
      }

      tasksNotified++;
    }

    // ── 2. BOARD CARDS — find incomplete cards with dueDate within next 24 hours or already past ──
    const cards = await db.boardCard.findMany({
      where: {
        assignedToUserId: { not: null },
        isCompleted: false,
        dueDate: { not: null },
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        list: { include: { board: { include: { workspace: true } } } },
      },
    });

    for (const card of cards) {
      if (!card.dueDate || !card.assignedUser || !card.assignedToUserId) continue;
      cardsChecked++;

      const hoursUntilDeadline = (card.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilDeadline > 24 || hoursUntilDeadline < -168) continue;

      let urgency: string;
      if (hoursUntilDeadline < 0) {
        urgency = `was due ${Math.round(Math.abs(hoursUntilDeadline))}h ago`;
      } else if (hoursUntilDeadline < 1) {
        urgency = "is due within the hour";
      } else {
        urgency = `is due in ${Math.round(hoursUntilDeadline)}h`;
      }

      const boardTitle = card.list.board.title;
      const notifTitle = `Card ${hoursUntilDeadline < 0 ? "Overdue" : "Due Soon"}: ${card.title}`;
      const notifBody = `Card "${card.title}" on board "${boardTitle}" ${urgency}.`;

      // In-app notification
      await createNotification(
        card.assignedToUserId,
        "TASK_ASSIGNED",
        notifTitle,
        notifBody,
        `/board`
      );

      // Email
      if (card.assignedUser.email) {
        await sendNotificationEmail(
          card.assignedUser.email,
          notifTitle,
          notifTitle,
          `${notifBody}`,
          `/board`
        );
      }

      cardsNotified++;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      tasks: { checked: tasksChecked, notified: tasksNotified },
      cards: { checked: cardsChecked, notified: cardsNotified },
    });
  } catch (error) {
    console.error("CRON_CHECK_DEADLINES_ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
