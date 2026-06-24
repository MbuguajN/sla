"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";

type DailyLogEntryInput = {
  projectId: number | null;
  taskId: number | null;
  note: string;
  markCompleted: boolean;
};

type DailyLogPayload = {
  entries: DailyLogEntryInput[];
};

const MAX_DAILY_LOG_ENTRIES = 25;
const MAX_NOTE_LENGTH = 4000;
const MAX_SUBTASK_TITLE_LENGTH = 120;

function deriveSubtaskTitle(note: string) {
  const normalized = note.replace(/\s+/g, " ").trim();
  if (!normalized) return "Daily log task";

  if (normalized.length <= MAX_SUBTASK_TITLE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_SUBTASK_TITLE_LENGTH - 3)}...`;
}

export async function createDailyLogs(payload: DailyLogPayload) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const entries = payload.entries ?? [];
  if (entries.length === 0) {
    throw new Error("Please add at least one log entry");
  }

  if (entries.length > MAX_DAILY_LOG_ENTRIES) {
    throw new Error(`Too many entries. Max ${MAX_DAILY_LOG_ENTRIES} per submission`);
  }

  const taskIds = Array.from(new Set(entries.filter((e) => e.taskId).map((entry) => entry.taskId as number)));

  const tasks = taskIds.length > 0
    ? await db.task.findMany({
        where: { id: { in: taskIds } },
        select: {
          id: true,
          title: true,
          projectId: true,
          project: { select: { title: true } },
          assignedUserId: true,
          createdById: true,
          deptId: true,
          status: true,
        },
      })
    : [];

  const taskMap = new Map(tasks.map((task) => [task.id, task]));

  for (const entry of entries) {
    const note = entry.note.trim();
    if (!note) {
      throw new Error("Daily log note cannot be empty");
    }

    if (note.length > MAX_NOTE_LENGTH) {
      throw new Error(`Daily log note is too long. Max ${MAX_NOTE_LENGTH} characters`);
    }

    // General log (no project/task) — skip task validation
    if (!entry.taskId) continue;

    const task = taskMap.get(entry.taskId);
    if (!task) throw new Error("One or more selected tasks were not found");

    if (entry.projectId && task.projectId !== entry.projectId) {
      throw new Error("Selected project does not match associated task");
    }

    const canAccessTask =
      user.role === "ADMIN" ||
      user.role === "CEO" ||
      task.assignedUserId === user.id ||
      task.createdById === user.id ||
      (user.departmentId && task.deptId === user.departmentId);

    if (!canAccessTask) {
      throw new Error("You are not allowed to add logs for one or more tasks");
    }

    if (task.status === "CANCELLED") {
      throw new Error("Cancelled tasks cannot receive daily logs");
    }
  }

  const createdIds = await db.$transaction(async (tx) => {
    const ids: number[] = [];

    for (const entry of entries) {
      const cleanNote = entry.note.trim();
      const task = entry.taskId ? taskMap.get(entry.taskId) : null;

      let subtaskId: number | undefined;

      // Only create subtask if a task is associated
      if (task) {
        const subtask = await tx.subtask.create({
          data: {
            taskId: task.id,
            title: deriveSubtaskTitle(cleanNote),
            description: cleanNote,
            status: entry.markCompleted ? "DONE" : "PENDING",
          },
        });
        subtaskId = subtask.id;
      }

      const created = await tx.activityLog.create({
        data: {
          type: "COMMENTED",
          description: entry.markCompleted ? "logged daily progress (completed)" : "logged daily progress",
          taskId: task?.id ?? null,
          projectId: task?.projectId ?? null,
          userId: user.id,
          metadata: JSON.stringify({
            kind: "DAILY_LOG",
            note: cleanNote,
            markCompleted: entry.markCompleted,
            projectTitle: task?.project?.title || null,
            taskTitle: cleanNote.slice(0, 80),
            parentTaskTitle: task?.title || null,
            subtaskId: subtaskId ?? null,
            source: "PERSONAL_LOG",
          }),
        },
      });

      ids.push(created.id);
    }

    return ids;
  });

  revalidatePath("/daily-log");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/tasks");

  for (const entry of entries) {
    revalidatePath(`/tasks/${entry.taskId}`);
  }

  return {
    success: true,
    count: createdIds.length,
  };
}
