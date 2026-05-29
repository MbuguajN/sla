"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { canManageCollectionCards, getCurrentUser } from "@/lib/permissions";
import { createNotification } from "./notificationActions";

type CollectionColumnSeed = {
  title: string;
  code: string;
  kind: "TODO" | "IN_PROGRESS" | "DONE";
  mappedTaskStatus: TaskStatus;
  position: number;
};

const DEFAULT_COLUMNS: CollectionColumnSeed[] = [
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

function sanitizeCode(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function ensurePersonalBoardColumns(userId: number) {
  const existing = await db.personalBoardColumn.findMany({
    where: { userId },
    select: { code: true },
  });

  const existingCodes = new Set(existing.map((column) => column.code));
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

async function ensureCollectionBoardColumns(boardId: number) {
  const existing = await db.collectionBoardColumn.findMany({
    where: { boardId },
    select: { code: true },
  });

  const existingCodes = new Set(existing.map((column) => column.code));
  const missing = DEFAULT_COLUMNS.filter((column) => !existingCodes.has(column.code));

  if (missing.length > 0) {
    await db.collectionBoardColumn.createMany({
      data: missing.map((column) => ({
        boardId,
        title: column.title,
        code: column.code,
        kind: column.kind,
        mappedTaskStatus: column.mappedTaskStatus,
        position: column.position,
      })),
    });
  }
}

async function findBoardAccess(boardId: number, userId: number) {
  return db.collectionBoardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
    select: { id: true, role: true, acceptedAt: true },
  });
}

async function assertBoardAccess(boardId: number, userId: number) {
  const access = await findBoardAccess(boardId, userId);
  if (!access || !access.acceptedAt) {
    throw new Error("You do not have access to this collection board");
  }

  return access;
}

async function assertBoardCardMutationAccess(
  boardId: number,
  user: { id: number; role: string; departmentSlug: string | null }
) {
  const board = await db.collectionBoard.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });

  if (!board) {
    throw new Error("Collection board not found");
  }

  if (board.ownerId === user.id || canManageCollectionCards(user)) {
    return board;
  }

  throw new Error("You do not have permission to edit cards on this board");
}

async function notifyCollectionBoardMembers(args: {
  boardId: number;
  actorId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const board = await db.collectionBoard.findUnique({
    where: { id: args.boardId },
    select: {
      members: {
        where: { acceptedAt: { not: null } },
        select: { userId: true },
      },
    },
  });

  if (!board) return;

  const recipientIds = new Set(board.members.map((member) => member.userId));
  recipientIds.delete(args.actorId);

  if (recipientIds.size === 0) return;

  await db.notification.createMany({
    data: [...recipientIds].map((userId) => ({
      userId,
      type: args.type as any,
      title: args.title,
      message: args.message,
      link: args.link,
    })),
  });
}

async function getPersonalBoardTodoColumn(userId: number) {
  await ensurePersonalBoardColumns(userId);

  const todoColumn = await db.personalBoardColumn.findFirst({
    where: { userId, code: "todo" },
    select: { id: true },
  });

  if (!todoColumn) {
    throw new Error("Unable to locate your personal board column");
  }

  return todoColumn;
}

async function syncTaskStatusForCollectionColumn(args: {
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
  const updateData: Prisma.TaskUpdateInput = { status: nextStatus };

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
      description: `Collection board moved task from ${task.status} to ${nextStatus}`,
      taskId: task.id,
      projectId: task.projectId,
      userId,
      metadata: JSON.stringify({ source: "COLLECTION_BOARD", previousStatus: task.status, nextStatus }),
    },
  });

  if (nextStatus === "DONE") {
    await tx.activityLog.create({
      data: {
        type: "COMPLETED",
        description: "Task marked complete from collection board",
        taskId: task.id,
        projectId: task.projectId,
        userId,
      },
    });
  }
}

async function syncPersonalBoardCardForTask(args: {
  tx: Prisma.TransactionClient;
  taskId: number;
  ownerId: number;
  assignedById: number;
  title: string;
  description: string | null;
  projectId: number;
  clientId: number;
  status: TaskStatus;
  updatedAt: Date;
}) {
  const { tx, taskId, ownerId, assignedById, title, description, projectId, clientId, status, updatedAt } = args;

  const targetColumn =
    (await tx.personalBoardColumn.findFirst({
      where: { userId: ownerId, mappedTaskStatus: status },
      select: { id: true, mappedTaskStatus: true },
    })) ||
    (await tx.personalBoardColumn.findFirst({
      where: { userId: ownerId, code: "todo" },
      select: { id: true, mappedTaskStatus: true },
    }));

  if (!targetColumn) {
    throw new Error("Personal board columns are not initialized");
  }

  const existing = await tx.personalBoardCard.findUnique({
    where: { taskId },
    select: { id: true },
  });

  if (existing) {
    await tx.personalBoardCard.update({
      where: { taskId },
      data: {
        title,
        description,
        assignedById,
        projectId,
        clientId,
        enteredColumnAt: updatedAt,
        columnId: targetColumn.id,
      },
    });
    return;
  }

  await tx.personalBoardCard.create({
    data: {
      ownerId,
      assignedById,
      columnId: targetColumn.id,
      taskId,
      projectId,
      clientId,
      title,
      description,
      position: 0,
      enteredColumnAt: updatedAt,
    },
  });
}

async function syncPersonalBoardCardStatus(args: {
  tx: Prisma.TransactionClient;
  taskId: number;
  ownerId: number;
  nextStatus: TaskStatus;
}) {
  const { tx, taskId, ownerId, nextStatus } = args;

  const personalCard = await tx.personalBoardCard.findUnique({
    where: { taskId },
    select: { id: true, columnId: true, ownerId: true, enteredColumnAt: true },
  });

  if (!personalCard || personalCard.ownerId !== ownerId) {
    return;
  }

  const targetColumn = await tx.personalBoardColumn.findFirst({
    where: { userId: ownerId, mappedTaskStatus: nextStatus },
    select: { id: true },
  });

  if (!targetColumn) {
    return;
  }

  if (personalCard.columnId === targetColumn.id) {
    return;
  }

  await tx.personalBoardCard.update({
    where: { id: personalCard.id },
    data: {
      columnId: targetColumn.id,
      enteredColumnAt: new Date(),
    },
  });
}

export async function getCollectionBoards() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const boards = await db.collectionBoard.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id, acceptedAt: { not: null } } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        where: { acceptedAt: { not: null } },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      accesses: {
        where: { userId: user.id },
        select: { lastAccessedAt: true },
      },
      _count: { select: { cards: true, columns: true, members: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return boards
    .map((board) => ({
      ...board,
      lastAccessedAt: board.accesses[0]?.lastAccessedAt ?? null,
    }))
    .sort((left, right) => {
      const leftTime = left.lastAccessedAt ? new Date(left.lastAccessedAt).getTime() : 0;
      const rightTime = right.lastAccessedAt ? new Date(right.lastAccessedAt).getTime() : 0;

      if (leftTime !== rightTime) return rightTime - leftTime;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
}

export async function createCollectionBoard(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name) throw new Error("Board name is required");

  const board = await db.$transaction(async (tx) => {
    const created = await tx.collectionBoard.create({
      data: {
        name,
        description: description || null,
        ownerId: user.id,
      },
    });

    await tx.collectionBoardMember.create({
      data: {
        boardId: created.id,
        userId: user.id,
        role: "OWNER",
        acceptedAt: new Date(),
      },
    });

    await tx.collectionBoardAccess.upsert({
      where: {
        boardId_userId: { boardId: created.id, userId: user.id },
      },
      update: { lastAccessedAt: new Date() },
      create: {
        boardId: created.id,
        userId: user.id,
        lastAccessedAt: new Date(),
      },
    });

    await tx.collectionBoardColumn.createMany({
      data: DEFAULT_COLUMNS.map((column) => ({
        boardId: created.id,
        title: column.title,
        code: column.code,
        kind: column.kind,
        mappedTaskStatus: column.mappedTaskStatus,
        position: column.position,
      })),
    });

    return created;
  });

  revalidatePath("/board/collections");
  redirect(`/board/collections/${board.id}`);
}

export async function getCollectionBoard(boardId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await assertBoardAccess(boardId, user.id);

  await db.collectionBoardAccess.upsert({
    where: { boardId_userId: { boardId, userId: user.id } },
    update: { lastAccessedAt: new Date() },
    create: { boardId, userId: user.id, lastAccessedAt: new Date() },
  });

  const [board, boards, projects] = await Promise.all([
    db.collectionBoard.findUnique({
      where: { id: boardId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          where: { acceptedAt: { not: null } },
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        },
        columns: {
          include: {
            cards: {
              include: {
                task: {
                  select: {
                    id: true,
                    createdById: true,
                    assignedUserId: true,
                    status: true,
                    priority: true,
                    source: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: { select: { id: true, name: true } },
                    assignedTo: { select: { id: true, name: true, role: true } },
                    project: {
                      select: {
                        id: true,
                        title: true,
                        client: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
                assignedBy: { select: { id: true, name: true, role: true } },
              },
              orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            },
          },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    getCollectionBoards(),
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

  if (!board) {
    throw new Error("Collection board not found");
  }

  const canCreateCards = board.ownerId === user.id || canManageCollectionCards(user);

  return {
    board,
    boards,
    projects,
    canEdit: board.ownerId === user.id,
    canCreateCards,
  };
}

export async function createCollectionBoardColumn(input: {
  boardId: number;
  title: string;
  mappedTaskStatus: TaskStatus;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const access = await assertBoardAccess(input.boardId, user.id);
  if (access.role !== "OWNER") {
    throw new Error("Only the board owner can add columns");
  }

  const title = input.title.trim();
  if (!title) throw new Error("Column title is required");
  if (!ALLOWED_CUSTOM_TASK_STATUSES.includes(input.mappedTaskStatus)) {
    throw new Error("Invalid status mapping for custom column");
  }

  const maxPosition = await db.collectionBoardColumn.aggregate({
    where: { boardId: input.boardId },
    _max: { position: true },
  });

  const code = `${sanitizeCode(title) || "custom-column"}-${Date.now()}`;

  const column = await db.collectionBoardColumn.create({
    data: {
      boardId: input.boardId,
      title,
      code,
      kind: "CUSTOM",
      mappedTaskStatus: input.mappedTaskStatus,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  await notifyCollectionBoardMembers({
    boardId: input.boardId,
    actorId: user.id,
    type: "TASK_ASSIGNED",
    title: "Collection board updated",
    message: `${user.name} added a new column called "${column.title}"`,
    link: `/board/collections/${input.boardId}`,
  });

  revalidatePath(`/board/collections/${input.boardId}`);
  return column;
}

export async function createCollectionBoardCard(input: {
  boardId: number;
  columnId: number;
  title: string;
  description?: string;
  projectId: number;
  assignedUserId?: number | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await assertBoardCardMutationAccess(input.boardId, user);
  await assertBoardAccess(input.boardId, user.id);

  const assignedUserId = input.assignedUserId ?? user.id;

  const [column, project, assignedUser] = await Promise.all([
    db.collectionBoardColumn.findUnique({
      where: { id: input.columnId },
      select: { id: true, boardId: true, mappedTaskStatus: true },
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
    db.user.findUnique({
      where: { id: assignedUserId },
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  if (!column || column.boardId !== input.boardId) {
    throw new Error("Invalid target column");
  }

  if (!project || project.status !== "ACTIVE" || project.client.status !== "ACTIVE") {
    throw new Error("Project or client is not active");
  }

  if (!assignedUser || !assignedUser.isActive) {
    throw new Error("Selected assignee was not found");
  }

  const boardMembership = await db.collectionBoardMember.findUnique({
    where: { boardId_userId: { boardId: input.boardId, userId: assignedUser.id } },
    select: { acceptedAt: true },
  });

  if (!boardMembership?.acceptedAt) {
    throw new Error("Selected assignee must be an accepted member of the board");
  }

  const title = input.title.trim();
  if (!title) throw new Error("Card title is required");

  const card = await db.$transaction(async (tx) => {
    const positionAggregate = await tx.collectionBoardCard.aggregate({
      where: { columnId: column.id },
      _max: { position: true },
    });

    const now = new Date();
    const task = await tx.task.create({
      data: {
        source: "COLLECTION_BOARD",
        title,
        description: input.description?.trim() || null,
        projectId: project.id,
        createdById: user.id,
        assignedUserId: assignedUser.id,
        deptId: user.departmentId,
        status: column.mappedTaskStatus,
        priority: "MEDIUM",
        ...(column.mappedTaskStatus === "IN_PROGRESS" || column.mappedTaskStatus === "DONE"
          ? { startedAt: now, slaStartedAt: now }
          : {}),
        ...(column.mappedTaskStatus === "DONE" ? { completedAt: now } : {}),
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    const created = await tx.collectionBoardCard.create({
      data: {
        boardId: input.boardId,
        columnId: column.id,
        taskId: task.id,
        assignedById: user.id,
        title,
        description: input.description?.trim() || null,
        position: (positionAggregate._max.position ?? -1) + 1,
        enteredColumnAt: now,
      },
      include: {
        task: {
          select: {
            id: true,
            createdById: true,
            assignedUserId: true,
            status: true,
            priority: true,
            source: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true, role: true } },
            project: {
              select: {
                id: true,
                title: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
        },
        assignedBy: { select: { id: true, name: true, role: true } },
      },
    });

    await tx.activityLog.create({
      data: {
        type: "CREATED",
        description: "Collection board task created",
        taskId: task.id,
        projectId: project.id,
        userId: user.id,
        metadata: JSON.stringify({ source: "COLLECTION_BOARD", boardId: input.boardId }),
      },
    });

    await syncPersonalBoardCardForTask({
      tx,
      taskId: task.id,
      ownerId: assignedUser.id,
      assignedById: user.id,
      title,
      description: input.description?.trim() || null,
      projectId: project.id,
      clientId: project.clientId,
      status: column.mappedTaskStatus,
      updatedAt: now,
    });

    return created;
  });

  await notifyCollectionBoardMembers({
    boardId: input.boardId,
    actorId: user.id,
    type: "TASK_ASSIGNED",
    title: "Collection board updated",
    message: `${user.name} assigned "${card.title}" to ${card.task.assignedTo?.name || assignedUser?.name || "a team member"}`,
    link: `/board/collections/${input.boardId}`,
  });

  revalidatePath(`/board/collections/${input.boardId}`);
  revalidatePath("/board");
  revalidatePath("/tasks");
  return card;
}

export async function moveCollectionBoardCard(input: {
  cardId: number;
  targetColumnId: number;
  targetPosition?: number;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const [card, targetColumn] = await Promise.all([
    db.collectionBoardCard.findUnique({
      where: { id: input.cardId },
      select: {
        id: true,
        boardId: true,
        columnId: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            startedAt: true,
            slaStartedAt: true,
            projectId: true,
            createdById: true,
            assignedUserId: true,
            project: {
              select: {
                title: true,
                clientId: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    db.collectionBoardColumn.findUnique({
      where: { id: input.targetColumnId },
      select: { id: true, boardId: true, mappedTaskStatus: true },
    }),
  ]);

  if (!card || !targetColumn || card.boardId !== targetColumn.boardId) {
    throw new Error("Card not found or target column invalid");
  }

  await assertBoardAccess(card.boardId, user.id);
  await assertBoardCardMutationAccess(card.boardId, user);

  await db.$transaction(async (tx) => {
    const destinationCardsRaw = await tx.collectionBoardCard.findMany({
      where: { columnId: targetColumn.id },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });

    const destinationCards =
      card.columnId === targetColumn.id
        ? destinationCardsRaw.filter((item) => item.id !== card.id)
        : destinationCardsRaw;

    const insertAt = clamp(input.targetPosition ?? destinationCards.length, 0, destinationCards.length);

    if (card.columnId !== targetColumn.id) {
      const sourceCards = await tx.collectionBoardCard.findMany({
        where: { columnId: card.columnId },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      });

      const sourceReordered = sourceCards.filter((item) => item.id !== card.id);
      for (let i = 0; i < sourceReordered.length; i += 1) {
        const sourceCard = sourceReordered[i];
        if (sourceCard.position !== i) {
          await tx.collectionBoardCard.update({
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
        await tx.collectionBoardCard.update({
          where: { id: destinationCard.id },
          data: { position: nextPosition },
        });
      }
    }

    await tx.collectionBoardCard.update({
      where: { id: card.id },
      data: {
        columnId: targetColumn.id,
        position: insertAt,
        ...(card.columnId !== targetColumn.id ? { enteredColumnAt: new Date() } : {}),
      },
    });

    await syncTaskStatusForCollectionColumn({
      tx,
      task: {
        id: card.task.id,
        title: card.task.title,
        status: card.task.status,
        projectId: card.task.projectId,
        project: { title: card.task.project.title },
        startedAt: card.task.startedAt,
        slaStartedAt: card.task.slaStartedAt,
      },
      nextStatus: targetColumn.mappedTaskStatus,
      userId: user.id,
    });

    await syncPersonalBoardCardStatus({
      tx,
      taskId: card.task.id,
      ownerId: card.task.assignedUserId || card.task.createdById || user.id,
      nextStatus: targetColumn.mappedTaskStatus,
    });
  });

  await notifyCollectionBoardMembers({
    boardId: card.boardId,
    actorId: user.id,
    type: "TASK_ASSIGNED",
    title: "Collection board updated",
    message: `${user.name} moved "${card.task.title}" to ${targetColumn.mappedTaskStatus.replaceAll("_", " ")}`,
    link: `/board/collections/${card.boardId}`,
  });

  revalidatePath(`/board/collections/${card.boardId}`);
  revalidatePath("/board");
  revalidatePath("/tasks");
  revalidatePath("/daily-log");
  return { success: true };
}

export async function inviteCollectionBoardMember(input: { boardId: number; email: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const access = await assertBoardAccess(input.boardId, user.id);
  if (access.role !== "OWNER") {
    throw new Error("Only the board owner can invite members");
  }

  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Email is required");

  if (email === user.email.toLowerCase()) {
    throw new Error("You are already on this board");
  }

  const invitedUser = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, isActive: true },
  });

  if (!invitedUser || !invitedUser.isActive) {
    throw new Error("User not found or inactive");
  }

  const existingMembership = await db.collectionBoardMember.findUnique({
    where: { boardId_userId: { boardId: input.boardId, userId: invitedUser.id } },
    select: { acceptedAt: true },
  });

  if (existingMembership?.acceptedAt) {
    throw new Error(`${invitedUser.name} is already a member of this board`);
  }

  if (existingMembership && !existingMembership.acceptedAt) {
    throw new Error(`Invite already pending for ${invitedUser.name}`);
  }

  await db.collectionBoardMember.create({
    data: {
      boardId: input.boardId,
      userId: invitedUser.id,
      role: "MEMBER",
      invitedAt: new Date(),
    },
  });

  await createNotification(
    invitedUser.id,
    "TASK_ASSIGNED",
    "Board Invitation",
    `${user.name} invited you to a collection board.`,
    `/board/collections/${input.boardId}/join`
  );

  revalidatePath(`/board/collections/${input.boardId}`);
  revalidatePath("/board/collections");
  return {
    success: true,
    status: "invited" as const,
    message: `Invite sent to ${invitedUser.name}.`,
  };
}

export async function acceptCollectionBoardInvite(boardId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const membership = await db.collectionBoardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
    select: { id: true, invitedAt: true, acceptedAt: true },
  });

  if (!membership) {
    throw new Error("No invitation found for this board");
  }

  if (!membership.acceptedAt) {
    await db.collectionBoardMember.update({
      where: { id: membership.id },
      data: { acceptedAt: new Date() },
    });
  }

  await db.collectionBoardAccess.upsert({
    where: { boardId_userId: { boardId, userId: user.id } },
    update: { lastAccessedAt: new Date() },
    create: { boardId, userId: user.id, lastAccessedAt: new Date() },
  });

  await notifyCollectionBoardMembers({
    boardId,
    actorId: user.id,
    type: "TASK_ASSIGNED",
    title: "Board member joined",
    message: `${user.name} accepted the board invitation.`,
    link: `/board/collections/${boardId}`,
  });

  revalidatePath(`/board/collections/${boardId}`);
  revalidatePath("/board/collections");
  return { success: true };
}

export async function updateCollectionBoardMemberRole(input: {
  boardId: number;
  userId: number;
  role: "OWNER" | "MEMBER";
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const access = await assertBoardAccess(input.boardId, user.id);
  if (access.role !== "OWNER") {
    throw new Error("Only the board owner can change roles");
  }

  await db.collectionBoardMember.update({
    where: { boardId_userId: { boardId: input.boardId, userId: input.userId } },
    data: { role: input.role },
  });

  await notifyCollectionBoardMembers({
    boardId: input.boardId,
    actorId: user.id,
    type: "TASK_ASSIGNED",
    title: "Board member role updated",
    message: `A member role was changed on the board.`,
    link: `/board/collections/${input.boardId}`,
  });

  revalidatePath(`/board/collections/${input.boardId}`);
  return { success: true };
}

export async function removeCollectionBoardMember(input: { boardId: number; userId: number }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const access = await assertBoardAccess(input.boardId, user.id);
  if (access.role !== "OWNER") {
    throw new Error("Only the board owner can remove members");
  }

  if (input.userId === user.id) {
    throw new Error("Owner cannot remove themselves");
  }

  await db.collectionBoardMember.delete({
    where: { boardId_userId: { boardId: input.boardId, userId: input.userId } },
  });

  await db.collectionBoardAccess.deleteMany({
    where: { boardId: input.boardId, userId: input.userId },
  });

  await notifyCollectionBoardMembers({
    boardId: input.boardId,
    actorId: user.id,
    type: "TASK_ASSIGNED",
    title: "Board member removed",
    message: `A member was removed from the board.`,
    link: `/board/collections/${input.boardId}`,
  });

  revalidatePath(`/board/collections/${input.boardId}`);
  return { success: true };
}
