"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { canViewOtherBoards, getCurrentUser } from "@/lib/permissions";

type DefaultColumnDef = {
  title: string;
  code: string;
  kind: "TODO" | "IN_PROGRESS" | "DONE";
  mappedTaskStatus: TaskStatus;
  position: number;
};

const DEFAULT_COLUMNS: DefaultColumnDef[] = [
  { title: "To Do", code: "todo", kind: "TODO", mappedTaskStatus: "ASSIGNED", position: 0 },
  {
    title: "In Progress",
    code: "in-progress",
    kind: "IN_PROGRESS",
    mappedTaskStatus: "IN_PROGRESS",
    position: 1,
  },
  { title: "Done", code: "done", kind: "DONE", mappedTaskStatus: "DONE", position: 2 },
];

const ALLOWED_CUSTOM_TASK_STATUSES: TaskStatus[] = [
  "ASSIGNED",
  "CONFIRMED",
  "IN_PROGRESS",
  "PAUSED",
  "SUBMITTED",
  "REVISION",
  "DONE",
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeColumnCode(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureDefaultColumns(userId: number) {
  const existing = await db.personalBoardColumn.findMany({
    where: { userId },
    select: { code: true },
  });

  const existingCodes = new Set(existing.map((item) => item.code));
  const missing = DEFAULT_COLUMNS.filter((column) => !existingCodes.has(column.code));

  if (missing.length > 0) {
    await db.personalBoardColumn.createMany({
      data: missing.map((column) => ({
        userId,
        title: column.title,
        code: column.code,
        kind: column.kind,
        mappedTaskStatus: column.mappedTaskStatus,
        position: column.position,
      })),
    });
  }
}

function buildBoardUserSelect() {
  return {
    id: true,
    name: true,
    email: true,
    role: true,
    departmentId: true,
    department: { select: { id: true, name: true, slug: true } },
  } satisfies Prisma.UserSelect;
}

function buildAutoDailyLogPayload(task: { id: number; title: string; projectId: number; projectTitle: string }) {
  const note = `Completed from personal board: ${task.title}`;
  return {
    type: "COMMENTED" as const,
    description: "logged daily progress (completed)",
    taskId: task.id,
    projectId: task.projectId,
    metadata: JSON.stringify({
      kind: "DAILY_LOG",
      note,
      markCompleted: true,
      taskTitle: task.title,
      projectTitle: task.projectTitle,
      source: "SELF_BOARD",
    }),
  };
}

async function syncTaskStatusForColumn(args: {
  tx: Prisma.TransactionClient;
  task: {
    id: number;
    title: string;
    status: TaskStatus;
    projectId: number;
    project: { title: string };
    startedAt: Date | null;
    slaStartedAt: Date | null;
  };
  nextStatus: TaskStatus;
  userId: number;
}) {
  const { tx, task, nextStatus, userId } = args;

  if (task.status === nextStatus) return;

  const now = new Date();
  const updateData: Prisma.TaskUpdateInput = {
    status: nextStatus,
  };

  if (nextStatus === "IN_PROGRESS") {
    if (!task.startedAt) updateData.startedAt = now;
    if (!task.slaStartedAt) updateData.slaStartedAt = now;
    updateData.completedAt = null;
  }

  if (nextStatus === "DONE") {
    if (!task.startedAt) updateData.startedAt = now;
    if (!task.slaStartedAt) updateData.slaStartedAt = now;
    updateData.completedAt = now;
  }

  if (nextStatus !== "DONE") {
    updateData.completedAt = null;
  }

  if (nextStatus !== "SUBMITTED") {
    updateData.submittedAt = null;
  }

  await tx.task.update({
    where: { id: task.id },
    data: updateData,
  });

  await tx.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: `Personal board moved task from ${task.status} to ${nextStatus}`,
      taskId: task.id,
      projectId: task.projectId,
      userId,
      metadata: JSON.stringify({ source: "SELF_BOARD", previousStatus: task.status, nextStatus }),
    },
  });

  if (nextStatus === "DONE") {
    await tx.activityLog.create({
      data: {
        type: "COMPLETED",
        description: "Task marked as complete from personal board",
        taskId: task.id,
        projectId: task.projectId,
        userId,
      },
    });

    await tx.activityLog.create({
      data: {
        ...buildAutoDailyLogPayload({
          id: task.id,
          title: task.title,
          projectId: task.projectId,
          projectTitle: task.project.title,
        }),
        userId,
      },
    });
  }
}

export async function getPersonalBoardData(viewUserId?: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const canSwitchBoards = canViewOtherBoards(user);
  const targetUserId = canSwitchBoards && viewUserId ? viewUserId : user.id;
  const canEditBoard = targetUserId === user.id;

  if (canEditBoard) {
    await ensureDefaultColumns(targetUserId);
  }

  const [columns, users, projects] = await Promise.all([
    db.personalBoardColumn.findMany({
      where: { userId: targetUserId },
      include: {
        cards: {
          include: {
            task: {
              select: {
                id: true,
                status: true,
                priority: true,
                source: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            project: { select: { id: true, title: true } },
            client: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true, role: true } },
            assignedBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    db.user.findMany({
      where: { isActive: true },
      select: buildBoardUserSelect(),
      orderBy: { name: "asc" },
    }),
    db.project.findMany({
      where: {
        status: "ACTIVE",
        client: { status: "ACTIVE" },
      },
      select: {
        id: true,
        title: true,
        clientId: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const selectedUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: buildBoardUserSelect(),
  });

  return {
    columns,
    users,
    projects,
    canSwitchBoards: canSwitchBoards,
    canEditBoard,
    selectedUser: selectedUser || {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      department: null,
    },
    me: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  };
}

export async function createPersonalBoardColumn(input: {
  title: string;
  mappedTaskStatus: TaskStatus;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const title = input.title.trim();
  if (!title) throw new Error("Column title is required");

  if (!ALLOWED_CUSTOM_TASK_STATUSES.includes(input.mappedTaskStatus)) {
    throw new Error("Invalid status mapping for custom column");
  }

  await ensureDefaultColumns(user.id);

  const maxPosition = await db.personalBoardColumn.aggregate({
    where: { userId: user.id },
    _max: { position: true },
  });

  const baseCode = sanitizeColumnCode(title) || "custom-column";
  const code = `${baseCode}-${Date.now()}`;

  const created = await db.personalBoardColumn.create({
    data: {
      userId: user.id,
      title,
      code,
      kind: "CUSTOM",
      mappedTaskStatus: input.mappedTaskStatus,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  revalidatePath("/board");
  return created;
}

export async function createPersonalBoardCard(input: {
  title: string;
  description?: string;
  projectId: number;
  clientId: number;
  assignedById?: number | null;
  columnId: number;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const title = input.title.trim();
  if (!title) throw new Error("Card title is required");

  const [column, project, assignedBy] = await Promise.all([
    db.personalBoardColumn.findUnique({
      where: { id: input.columnId },
      select: { id: true, userId: true, mappedTaskStatus: true },
    }),
    db.project.findUnique({
      where: { id: input.projectId },
      select: {
        id: true,
        title: true,
        status: true,
        clientId: true,
        client: { select: { id: true, status: true } },
      },
    }),
    input.assignedById
      ? db.user.findUnique({
          where: { id: input.assignedById },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!column || column.userId !== user.id) {
    throw new Error("Invalid target column");
  }

  if (!project || project.status !== "ACTIVE" || project.client.status !== "ACTIVE") {
    throw new Error("Project or client is not active");
  }

  if (project.clientId !== input.clientId) {
    throw new Error("Selected client does not match project");
  }

  if (input.assignedById && !assignedBy) {
    throw new Error("Selected assigner was not found");
  }

  const created = await db.$transaction(async (tx) => {
    const positionAggregate = await tx.personalBoardCard.aggregate({
      where: { columnId: column.id },
      _max: { position: true },
    });

    const now = new Date();
    const task = await tx.task.create({
      data: {
        source: "SELF_BOARD",
        title,
        description: input.description?.trim() || null,
        projectId: project.id,
        createdById: user.id,
        assignedUserId: user.id,
        deptId: user.departmentId,
        status: column.mappedTaskStatus,
        priority: "MEDIUM",
        ...(column.mappedTaskStatus === "IN_PROGRESS" || column.mappedTaskStatus === "DONE"
          ? { startedAt: now, slaStartedAt: now }
          : {}),
        ...(column.mappedTaskStatus === "DONE" ? { completedAt: now } : {}),
      },
      include: {
        project: { select: { title: true } },
      },
    });

    const card = await tx.personalBoardCard.create({
      data: {
        ownerId: user.id,
        assignedById: input.assignedById || null,
        columnId: column.id,
        taskId: task.id,
        projectId: project.id,
        clientId: input.clientId,
        title,
        description: input.description?.trim() || null,
        position: (positionAggregate._max.position ?? -1) + 1,
        enteredColumnAt: now,
      },
      include: {
        task: {
          select: {
            id: true,
            status: true,
            priority: true,
            source: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        project: { select: { id: true, title: true } },
        client: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, role: true } },
        assignedBy: { select: { id: true, name: true, role: true } },
      },
    });

    await tx.activityLog.create({
      data: {
        type: "CREATED",
        description: "Self-board task created",
        taskId: task.id,
        projectId: project.id,
        userId: user.id,
        metadata: JSON.stringify({ source: "SELF_BOARD", assignedById: input.assignedById || null }),
      },
    });

    if (column.mappedTaskStatus === "DONE") {
      await tx.activityLog.create({
        data: {
          ...buildAutoDailyLogPayload({
            id: task.id,
            title: task.title,
            projectId: project.id,
            projectTitle: task.project.title,
          }),
          userId: user.id,
        },
      });
    }

    return card;
  });

  revalidatePath("/board");
  revalidatePath("/tasks");
  revalidatePath("/daily-log");
  revalidatePath("/reports");
  revalidatePath("/dashboard");

  return created;
}

export async function movePersonalBoardCard(input: {
  cardId: number;
  targetColumnId: number;
  targetPosition?: number;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const [card, targetColumn] = await Promise.all([
    db.personalBoardCard.findUnique({
      where: { id: input.cardId },
      include: {
        task: {
          include: {
            project: { select: { title: true } },
          },
        },
      },
    }),
    db.personalBoardColumn.findUnique({
      where: { id: input.targetColumnId },
      select: { id: true, userId: true, mappedTaskStatus: true },
    }),
  ]);

  if (!card || card.ownerId !== user.id) {
    throw new Error("Card not found or access denied");
  }

  if (!targetColumn || targetColumn.userId !== user.id) {
    throw new Error("Target column is invalid");
  }

  // Once a card reaches DONE, it can only stay in DONE-mapped columns.
  if (card.task.status === "DONE" && targetColumn.mappedTaskStatus !== "DONE") {
    throw new Error("Done cards cannot be moved back to other columns");
  }

  await db.$transaction(async (tx) => {
    const destinationCardsRaw = await tx.personalBoardCard.findMany({
      where: { columnId: targetColumn.id },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });

    const destinationCards =
      card.columnId === targetColumn.id
        ? destinationCardsRaw.filter((item) => item.id !== card.id)
        : destinationCardsRaw;

    const insertAt = clamp(input.targetPosition ?? destinationCards.length, 0, destinationCards.length);

    if (card.columnId !== targetColumn.id) {
      const sourceCards = await tx.personalBoardCard.findMany({
        where: { columnId: card.columnId },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      });

      const sourceReordered = sourceCards.filter((item) => item.id !== card.id);
      for (let i = 0; i < sourceReordered.length; i += 1) {
        const sourceCard = sourceReordered[i];
        if (sourceCard.position !== i) {
          await tx.personalBoardCard.update({
            where: { id: sourceCard.id },
            data: { position: i },
          });
        }
      }
    }

    for (let i = 0; i < destinationCards.length; i += 1) {
      const destinationCard = destinationCards[i];
      const nextPosition = i >= insertAt ? i + 1 : i;
      if (destinationCard.position !== nextPosition) {
        await tx.personalBoardCard.update({
          where: { id: destinationCard.id },
          data: { position: nextPosition },
        });
      }
    }

    await tx.personalBoardCard.update({
      where: { id: card.id },
      data: {
        columnId: targetColumn.id,
        position: insertAt,
        ...(card.columnId !== targetColumn.id ? { enteredColumnAt: new Date() } : {}),
      },
    });

    await syncTaskStatusForColumn({
      tx,
      task: {
        id: card.task.id,
        title: card.task.title,
        status: card.task.status,
        projectId: card.task.projectId,
        project: card.task.project,
        startedAt: card.task.startedAt,
        slaStartedAt: card.task.slaStartedAt,
      },
      nextStatus: targetColumn.mappedTaskStatus,
      userId: user.id,
    });
  });

  revalidatePath("/board");
  revalidatePath("/tasks");
  revalidatePath("/daily-log");
  revalidatePath("/reports");
  revalidatePath("/dashboard");

  return { success: true };
}
