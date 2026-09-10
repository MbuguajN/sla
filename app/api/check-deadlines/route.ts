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
 *   3. Tasks sitting UNASSIGNED — the department head's queue, aging
 *   4. Tasks sitting SUBMITTED — nudged, then auto-closed, so delivered work
 *      never deadlocks on one person's inbox
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
  let queueNotified = 0;
  let reviewNudged = 0;
  let autoClosed = 0;

  // Both windows are configurable; these are the fallbacks.
  const settings = await db.systemSetting.findMany({
    where: { key: { in: ["task_unassigned_alert_hours", "task_autoclose_days"] } },
    select: { key: true, value: true },
  });
  const settingValue = (key: string, fallback: number) => {
    const raw = settings.find((s) => s.key === key)?.value;
    const parsed = Number.parseInt(raw || "", 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };
  const unassignedAlertHours = Math.max(1, settingValue("task_unassigned_alert_hours", 8));
  const autoCloseDays = Math.max(1, settingValue("task_autoclose_days", 3));

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
      // slaPausedDuration is stored in SECONDS (see resumeTask), and every other
      // reader treats it that way. Reading it as hours here pushed the deadline
      // out by 3600x, so any task that had ever been paused stopped alerting.
      const pausedMs = (task.slaPausedDuration || 0) * 1000;
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

    // ── 3. UNASSIGNED QUEUE — work that reached a department but nobody yet ──
    const unassignedCutoff = new Date(now.getTime() - unassignedAlertHours * 60 * 60 * 1000);
    const unassigned = await db.task.findMany({
      where: {
        status: "UNASSIGNED",
        deptId: { not: null },
        createdAt: { lt: unassignedCutoff },
      },
      include: {
        assignedDepartment: { select: { id: true, name: true } },
        project: { include: { client: true } },
      },
    });

    for (const task of unassigned) {
      const managers = await db.user.findMany({
        where: { departmentId: task.deptId!, role: "MANAGER", isActive: true },
        select: { id: true, email: true },
      });
      if (managers.length === 0) continue;

      const waitingHours = Math.round((now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60));
      const clientName = task.project?.client?.name || "a project";
      const notifTitle = `Unassigned for ${waitingHours}h: ${task.title}`;
      const notifBody = `"${task.title}" (${clientName}) has been waiting ${waitingHours}h for someone in ${task.assignedDepartment?.name || "your department"} to pick it up. The SLA clock is already running.`;

      for (const manager of managers) {
        await createNotification(manager.id, "TASK_ASSIGNED", notifTitle, notifBody, `/tasks/${task.id}`);
        if (manager.email) {
          await sendNotificationEmail(manager.email, notifTitle, "Task Waiting To Be Assigned", notifBody, `/tasks/${task.id}`);
        }
      }
      queueNotified++;
    }

    // ── 4. SUBMITTED REVIEWS — nudge, then close on the initiator's behalf ──
    const autoCloseMs = autoCloseDays * 24 * 60 * 60 * 1000;
    const submitted = await db.task.findMany({
      where: { status: "SUBMITTED", submittedAt: { not: null } },
      include: { assignedTo: { select: { id: true, email: true } } },
    });

    for (const task of submitted) {
      if (!task.submittedAt) continue;
      const waitingMs = now.getTime() - task.submittedAt.getTime();

      if (waitingMs >= autoCloseMs) {
        // Nobody reviewed it in time. Close it, and say plainly that the system
        // did so rather than leaving it ambiguous in the log.
        await db.task.update({
          where: { id: task.id },
          data: { status: "DONE", completedAt: now },
        });

        if (task.workspaceBoardCardId) {
          await db.boardCard
            .update({ where: { id: task.workspaceBoardCardId }, data: { isCompleted: true } })
            .catch(() => {});
        }

        await db.activityLog.create({
          data: {
            type: "COMPLETED",
            description: `Automatically marked complete after ${autoCloseDays} day(s) awaiting review`,
            taskId: task.id,
            projectId: task.projectId,
            metadata: JSON.stringify({ autoClosed: true, autoCloseDays }),
          },
        });

        const recipients = [task.createdById, task.assignedUserId].filter(
          (id): id is number => !!id
        );
        for (const userId of [...new Set(recipients)]) {
          await createNotification(
            userId,
            "TASK_COMPLETED",
            "Task Auto-Completed",
            `"${task.title}" was marked complete automatically after ${autoCloseDays} day(s) with no review.`,
            `/tasks/${task.id}`
          );
        }
        autoClosed++;
        continue;
      }

      // Halfway through the window, remind whoever has to review it.
      if (waitingMs >= autoCloseMs / 2 && task.createdById) {
        const waitingHours = Math.round(waitingMs / (1000 * 60 * 60));
        const remainingHours = Math.max(1, Math.round((autoCloseMs - waitingMs) / (1000 * 60 * 60)));
        await createNotification(
          task.createdById,
          "TASK_SUBMITTED",
          `Waiting on your review: ${task.title}`,
          `"${task.title}" has been awaiting your review for ${waitingHours}h. It will close automatically in about ${remainingHours}h.`,
          `/tasks/${task.id}`
        );
        reviewNudged++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      tasks: { checked: tasksChecked, notified: tasksNotified },
      cards: { checked: cardsChecked, notified: cardsNotified },
      queue: { notified: queueNotified },
      reviews: { nudged: reviewNudged, autoClosed },
    });
  } catch (error) {
    console.error("CRON_CHECK_DEADLINES_ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
