"use server";

import { db } from "@/lib/db";
import { DEPARTMENTS } from "@/lib/permissions";

let activeUsersCache: { users: { id: number }[]; at: number } | null = null;
const CACHE_TTL = 60_000;

async function getAllActiveUserIds(): Promise<number[]> {
  const now = Date.now();
  if (activeUsersCache && now - activeUsersCache.at < CACHE_TTL) {
    return activeUsersCache.users.map((u) => u.id);
  }
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  activeUsersCache = { users, at: now };
  return users.map((u) => u.id);
}

export async function ensureClientWorkspace(clientId: number) {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return null;

  if (client.workspaceId) {
    return db.workspace.findUnique({ where: { id: client.workspaceId } });
  }

  const userIds = await getAllActiveUserIds();

  const workspace = await db.workspace.create({
    data: {
      name: client.name,
      ownerId: userIds[0] || 1,
      members: {
        create: userIds.map((uid) => ({ userId: uid, role: "MEMBER" })),
      },
    },
  });

  await db.client.update({
    where: { id: clientId },
    data: { workspaceId: workspace.id },
  });

  return workspace;
}

export async function getDefaultList(boardId: number) {
  let list = await db.boardList.findFirst({
    where: { boardId },
    orderBy: { position: "asc" },
  });

  if (!list) {
    list = await db.boardList.create({
      data: { boardId, title: "List 1", position: 0 },
    });
  }

  return list;
}

export async function ensureProjectBoard(projectId: number) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  });
  if (!project) return null;

  const existing = await db.board.findUnique({ where: { projectId } });
  if (existing) return existing;

  const workspace = await ensureClientWorkspace(project.clientId);
  if (!workspace) return null;

  const board = await db.board.create({
    data: {
      workspaceId: workspace.id,
      title: project.title,
      type: "PROJECT",
      projectId: project.id,
      visibility: "WORKSPACE",
    },
  });

  const userIds = await getAllActiveUserIds();
  await db.boardMember.createMany({
    data: userIds.map((uid) => ({ boardId: board.id, userId: uid, role: "MEMBER" })),
    skipDuplicates: true,
  });

  await getDefaultList(board.id);

  return board;
}

export async function ensureStandaloneBoard(boardId: number) {
  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board || board.projectId) return board;

  let internalClient = await db.client.findFirst({
    where: { name: "Internal" },
  });

  if (!internalClient) {
    internalClient = await db.client.create({
      data: {
        name: "Internal",
        status: "ACTIVE",
      },
    });
  }

  const workspace = await ensureClientWorkspace(internalClient.id);
  if (!workspace) return board;

  const project = await db.project.create({
    data: {
      clientId: internalClient.id,
      title: board.title,
      status: "ACTIVE",
    },
  });

  const updated = await db.board.update({
    where: { id: boardId },
    data: {
      type: "STANDALONE",
      projectId: project.id,
    },
  });

  return updated;
}

export async function syncTaskToCard(taskId: number) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return null;

  if (task.workspaceBoardCardId) {
    await db.boardCard.update({
      where: { id: task.workspaceBoardCardId },
      data: {
        title: task.title,
        description: task.description,
        assignedToUserId: task.assignedUserId,
        isCompleted: task.status === "DONE",
      },
    });
    return db.boardCard.findUnique({ where: { id: task.workspaceBoardCardId } });
  }

  const board = await ensureProjectBoard(task.projectId);
  if (!board) return null;

  const list = await getDefaultList(board.id);

  const maxPos = await db.boardCard.aggregate({
    where: { listId: list.id },
    _max: { position: true },
  });

  const card = await db.boardCard.create({
    data: {
      listId: list.id,
      title: task.title,
      description: task.description,
      assignedToUserId: task.assignedUserId,
      isCompleted: task.status === "DONE",
      position: (maxPos._max.position ?? -1) + 1,
      taskId: task.id,
    },
  });

  await db.task.update({
    where: { id: taskId },
    data: { workspaceBoardCardId: card.id },
  });

  if (task.assignedUserId) {
    await db.boardMember.upsert({
      where: { boardId_userId: { boardId: board.id, userId: task.assignedUserId } },
      create: { boardId: board.id, userId: task.assignedUserId, role: "MEMBER" },
      update: {},
    });
  }

  return card;
}

export async function syncCardToTask(cardId: number) {
  const card = await db.boardCard.findUnique({
    where: { id: cardId },
    include: { list: { include: { board: true } } },
  });
  if (!card) return null;

  if (card.taskId) {
    const statusUpdate = card.isCompleted ? "DONE" : undefined;
    await db.task.update({
      where: { id: card.taskId },
      data: {
        title: card.title,
        description: card.description,
        assignedUserId: card.assignedToUserId,
        ...(statusUpdate ? { status: statusUpdate, completedAt: card.isCompleted ? new Date() : null } : {}),
      },
    });
    return db.task.findUnique({ where: { id: card.taskId } });
  }

  const board = card.list.board;
  if (!board.projectId) return null;

  const task = await db.task.create({
    data: {
      projectId: board.projectId,
      title: card.title,
      description: card.description,
      assignedUserId: card.assignedToUserId,
      status: card.isCompleted ? "DONE" : "UNASSIGNED",
      source: "BOARD",
      completedAt: card.isCompleted ? new Date() : null,
    },
  });

  await db.boardCard.update({
    where: { id: cardId },
    data: { taskId: task.id },
  });

  await db.task.update({
    where: { id: task.id },
    data: { workspaceBoardCardId: cardId },
  });

  if (card.assignedToUserId) {
    await db.task.update({
      where: { id: task.id },
      data: { status: "ASSIGNED" },
    });
  }

  return task;
}

export async function syncSubtaskToChecklistItem(subtaskId: number) {
  const subtask = await db.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: { include: { workspaceBoardCard: true } } },
  });
  if (!subtask || !subtask.task.workspaceBoardCard) return null;

  const cardId = subtask.task.workspaceBoardCardId!;

  if (subtask.checklistItemId) {
    await db.boardChecklistItem.update({
      where: { id: subtask.checklistItemId },
      data: {
        title: subtask.title,
        isDone: subtask.status === "DONE",
      },
    });
    return db.boardChecklistItem.findUnique({ where: { id: subtask.checklistItemId } });
  }

  let checklist = await db.boardChecklist.findFirst({ where: { cardId } });
  if (!checklist) {
    checklist = await db.boardChecklist.create({
      data: { cardId, title: "Checklist", position: 0 },
    });
  }

  const maxPos = await db.boardChecklistItem.aggregate({
    where: { checklistId: checklist.id },
    _max: { position: true },
  });

  const item = await db.boardChecklistItem.create({
    data: {
      checklistId: checklist.id,
      title: subtask.title,
      isDone: subtask.status === "DONE",
      position: (maxPos._max.position ?? -1) + 1,
      subtaskId: subtask.id,
    },
  });

  await db.subtask.update({
    where: { id: subtaskId },
    data: { checklistItemId: item.id },
  });

  return item;
}

export async function syncChecklistItemToSubtask(checklistItemId: number) {
  const item = await db.boardChecklistItem.findUnique({
    where: { id: checklistItemId },
    include: { checklist: { include: { card: { include: { task: true } } } } },
  });
  if (!item || !item.checklist.card.taskId) return null;

  const taskId = item.checklist.card.taskId;

  if (item.subtaskId) {
    await db.subtask.update({
      where: { id: item.subtaskId },
      data: {
        title: item.title,
        status: item.isDone ? "DONE" : "PENDING",
      },
    });
    return db.subtask.findUnique({ where: { id: item.subtaskId } });
  }

  const subtask = await db.subtask.create({
    data: {
      taskId,
      title: item.title,
      status: item.isDone ? "DONE" : "PENDING",
      checklistItemId: item.id,
    },
  });

  await db.boardChecklistItem.update({
    where: { id: checklistItemId },
    data: { subtaskId: subtask.id },
  });

  return subtask;
}

export async function addBoardMemberForAssignee(boardId: number, userId: number) {
  await db.boardMember.upsert({
    where: { boardId_userId: { boardId, userId } },
    create: { boardId, userId, role: "MEMBER" },
    update: {},
  });
}
