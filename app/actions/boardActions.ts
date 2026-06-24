"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { BoardVisibility } from "@prisma/client";
import { createNotification } from "./notificationActions";
import { sendNotificationEmail } from "@/lib/email";

/**
 * FETCHING
 */

export async function getWorkspaces() {
  const user = await getCurrentUser();
  if (!user) return [];

  const workspaces = await db.workspace.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
        { boards: { some: { members: { some: { userId: user.id } } } } }
      ]
    },
    include: {
      boards: {
        orderBy: { updatedAt: "desc" },
        where: {
          OR: [
            { workspace: { ownerId: user.id } },
            { members: { some: { userId: user.id } } },
            { visibility: "WORKSPACE", workspace: { members: { some: { userId: user.id } } } },
            { visibility: "PUBLIC" }
          ]
        },
        include: {
          visits: {
            where: { userId: user.id },
            take: 1,
            orderBy: { visitedAt: "desc" },
            select: { visitedAt: true }
          }
        }
      },
      members: {
        include: { user: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return workspaces;
}

export async function getBoard(boardId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Check board exists and user has access via workspace
  const board = await db.board.findUnique({
    where: { id: boardId },
    include: {
      workspace: {
        include: {
          members: { where: { userId: user.id } }
        }
      },
      lists: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { position: "asc" },
            include: {
              labels: true,
              members: true
            }
          }
        }
      }
    }
  });

  if (!board) return null;

  const isOwner = board.workspace.ownerId === user.id;
  const isMember = board.workspace.members.length > 0;

  if (!isOwner && !isMember) throw new Error("Unauthorized");

  return board;
}

/**
 * MUTATIONS
 */

export async function createWorkspace(data: { name: string; description?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const workspace = await db.workspace.create({
    data: {
      name: data.name,
      description: data.description,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER"
        }
      }
    }
  });

  revalidatePath("/board");
  return workspace;
}

export async function deleteWorkspace(workspaceId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) throw new Error("Workspace not found");
  if (ws.ownerId !== user.id) throw new Error("Only the owner can delete a workspace");

  await db.workspace.delete({ where: { id: workspaceId } });
  revalidatePath("/board");
}

export async function createBoard(data: {
  workspaceId: number; 
  title: string; 
  background?: string; 
  visibility?: BoardVisibility 
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Verify access to workspace
  const ws = await db.workspace.findFirst({
    where: {
      id: data.workspaceId,
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } }
      ]
    }
  });

  if (!ws) throw new Error("You are not a member of this workspace");

  const board = await db.board.create({
    data: {
      workspaceId: data.workspaceId,
      title: data.title,
      background: data.background || "bg-sky-600",
      visibility: data.visibility || BoardVisibility.WORKSPACE
    }
  });

  revalidatePath("/board");
  return board;
}

/**
 * BOARD MEMBERS
 */

export async function getBoardMembers(boardId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const members = await db.boardMember.findMany({
    where: { boardId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return members;
}

export async function inviteToBoard(boardId: number, userId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const board = await db.board.findUnique({ where: { id: boardId }, include: { workspace: true } });
  if (!board) throw new Error("Board not found");

  const isWsOwner = board.workspace.ownerId === user.id;
  const isWsMember = await db.workspaceMember.findFirst({ where: { workspaceId: board.workspaceId, userId: user.id } });
  if (!isWsOwner && !isWsMember) throw new Error("Unauthorized");

  const existing = await db.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
  if (existing) return existing;

  const member = await db.boardMember.create({
    data: { boardId, userId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // In-app notification
  await createNotification(
    userId,
    "BOARD_INVITE",
    "Board Invite",
    `${user.name} added you to board "${board.title}"`,
    `/board?active=${boardId}`
  );

  // Email notification
  if (member.user.email) {
    await sendNotificationEmail(
      member.user.email,
      `You've been added to board "${board.title}"`,
      "Board Invite",
      `<strong>${user.name}</strong> added you to the board <strong>"${board.title}"</strong> in workspace <strong>"${board.workspace.name}"</strong>.`,
      `/board?active=${boardId}`
    );
  }

  revalidatePath("/board");
  return member;
}

export async function removeBoardMember(boardId: number, userId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const board = await db.board.findUnique({ where: { id: boardId }, include: { workspace: true } });
  if (!board) throw new Error("Board not found");

  if (board.workspace.ownerId !== user.id) throw new Error("Unauthorized");

  await db.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
  revalidatePath("/board");
}

/**
 * FULL BOARD DATA (lists + cards with all relations)
 */

export async function getBoardData(boardId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const board = await db.board.findUnique({
    where: { id: boardId },
    include: {
      workspace: {
        include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
      },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } }
      },
      lists: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { position: "asc" },
            include: {
              labels: true,
              members: { include: { user: { select: { id: true, name: true, email: true } } } },
              checklists: {
                orderBy: { position: "asc" },
                include: {
                  items: { orderBy: { position: "asc" } }
                }
              },
              attachments: true,
              activity: { orderBy: { createdAt: "desc" } },
            }
          }
        }
      }
    }
  });

  if (!board) return null;

  const isOwner = board.workspace.ownerId === user.id;
  const isWsMember = board.workspace.members.some((m: any) => m.userId === user.id);
  const isBoardMember = board.members.some((m: any) => m.userId === user.id);

  // Workspace owner always has access
  if (isOwner) return board;

  // Board members always have access
  if (isBoardMember) return board;

  // PUBLIC visibility: any workspace member can view
  if (board.visibility === "PUBLIC" && isWsMember) return board;

  // WORKSPACE visibility: workspace members can view
  if (board.visibility === "WORKSPACE" && isWsMember) return board;

  // Otherwise: no access
  throw new Error("Unauthorized");
}

/**
 * RECORD BOARD VISIT
 */

export async function recordBoardVisit(boardId: number) {
  const user = await getCurrentUser();
  if (!user) return;

  await db.boardVisit.upsert({
    where: { boardId_userId: { boardId, userId: user.id } },
    update: { visitedAt: new Date() },
    create: { boardId, userId: user.id },
  });
}

/**
 * TOGGLE BOARD STAR
 */

export async function toggleBoardStar(boardId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) throw new Error("Board not found");

  await db.board.update({ where: { id: boardId }, data: { isStarred: !board.isStarred } });
  revalidatePath("/board");
  return { isStarred: !board.isStarred };
}

export async function deleteBoard(boardId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const board = await db.board.findUnique({ where: { id: boardId }, include: { workspace: true } });
  if (!board) throw new Error("Board not found");
  if (board.workspace.ownerId !== user.id) throw new Error("Only the workspace owner can delete a board");

  await db.board.delete({ where: { id: boardId } });
  revalidatePath("/board");
}

export async function updateBoardVisibility(boardId: number, visibility: BoardVisibility) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const board = await db.board.findUnique({ where: { id: boardId }, include: { workspace: true } });
  if (!board) throw new Error("Board not found");
  if (board.workspace.ownerId !== user.id) throw new Error("Only the workspace owner can change board visibility");

  await db.board.update({ where: { id: boardId }, data: { visibility } });
  revalidatePath("/board");
}

/**
 * LIST MUTATIONS
 */

export async function createList(boardId: number, title: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const maxPos = await db.boardList.aggregate({ where: { boardId }, _max: { position: true } });
  const nextPos = (maxPos._max.position ?? -1) + 1;

  const list = await db.boardList.create({
    data: { boardId, title, position: nextPos, createdById: user.id },
  });

  revalidatePath("/board");
  return list;
}

export async function renameList(listId: number, title: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const list = await db.boardList.findUnique({ where: { id: listId } });
  if (!list) throw new Error("List not found");
  if (list.isRestricted) throw new Error("This list is restricted");

  const isCreator = list.createdById === user.id;
  const board = await db.board.findUnique({ where: { id: list.boardId }, include: { workspace: true } });
  const isWsOwner = board?.workspace.ownerId === user.id;
  if (!isCreator && !isWsOwner) throw new Error("Unauthorized");

  await db.boardList.update({ where: { id: listId }, data: { title } });
  revalidatePath("/board");
}

export async function deleteList(listId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const list = await db.boardList.findUnique({ where: { id: listId } });
  if (!list) throw new Error("List not found");

  const isCreator = list.createdById === user.id;
  const board = await db.board.findUnique({ where: { id: list.boardId }, include: { workspace: true } });
  const isWsOwner = board?.workspace.ownerId === user.id;
  if (!isCreator && !isWsOwner) throw new Error("Unauthorized");

  await db.boardList.delete({ where: { id: listId } });
  revalidatePath("/board");
}

export async function toggleListRestrict(listId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const list = await db.boardList.findUnique({ where: { id: listId } });
  if (!list) throw new Error("List not found");

  const isCreator = list.createdById === user.id;
  const board = await db.board.findUnique({ where: { id: list.boardId }, include: { workspace: true } });
  const isWsOwner = board?.workspace.ownerId === user.id;
  if (!isCreator && !isWsOwner) throw new Error("Unauthorized");

  await db.boardList.update({ where: { id: listId }, data: { isRestricted: !list.isRestricted } });
  revalidatePath("/board");
  return { isRestricted: !list.isRestricted };
}

export async function moveList(listId: number, newPosition: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const list = await db.boardList.findUnique({ where: { id: listId } });
  if (!list) throw new Error("List not found");

  const allLists = await db.boardList.findMany({
    where: { boardId: list.boardId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  const ids = allLists.map(l => l.id).filter(id => id !== listId);
  ids.splice(newPosition, 0, listId);

  for (let idx = 0; idx < ids.length; idx++) {
    await db.boardList.update({ where: { id: ids[idx] }, data: { position: idx } });
  }

  revalidatePath("/board");
}

/**
 * CARD MUTATIONS
 */

export async function createCard(listId: number, title: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const list = await db.boardList.findUnique({ where: { id: listId } });
  if (!list) throw new Error("List not found");
  if (list.isRestricted) throw new Error("This list is restricted");

  const maxPos = await db.boardCard.aggregate({ where: { listId }, _max: { position: true } });
  const nextPos = (maxPos._max.position ?? -1) + 1;

  const card = await db.boardCard.create({
    data: { listId, title, position: nextPos },
  });

  await db.boardCardMember.create({
    data: { cardId: card.id, userId: user.id },
  });

  await db.boardCardActivity.create({
    data: { cardId: card.id, type: "SYSTEM", actorName: "System", message: "Card created" },
  });

  revalidatePath("/board");
  return card;
}

export async function updateCardTitle(cardId: number, title: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardCard.update({ where: { id: cardId }, data: { title } });
  revalidatePath("/board");
}

export async function updateCardDescription(cardId: number, description: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardCard.update({ where: { id: cardId }, data: { description } });
  revalidatePath("/board");
}

export async function toggleCardComplete(cardId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const card = await db.boardCard.findUnique({
    where: { id: cardId },
    include: {
      checklists: { include: { items: true } },
      list: { include: { board: { include: { workspace: true } } } }
    }
  });
  if (!card) throw new Error("Card not found");

  const newCompleted = !card.isCompleted;

  if (newCompleted) {
    if (!card.assignedToUserId) throw new Error("Card must be assigned before marking as done");
    if (card.assignedToUserId !== user.id) throw new Error("Only the assigned member can mark this card as done");

    const allItems = card.checklists.flatMap(cl => cl.items);
    if (allItems.length > 0 && !allItems.every(i => i.isDone)) {
      throw new Error("All checklist items must be completed before marking this card as done");
    }

    await db.boardCard.update({ where: { id: cardId }, data: { isCompleted: true } });

    if (card.includeInLogs) {
      const boardTitle = card.list.board.title;
      const workspaceName = card.list.board.workspace?.name || boardTitle;
      await db.activityLog.create({
        data: {
          type: "COMMENTED",
          description: "Board card completed",
          userId: card.assignedToUserId,
          metadata: JSON.stringify({
            kind: "DAILY_LOG",
            note: `Completed board task: ${card.title}`,
            markCompleted: true,
            taskTitle: card.title,
            parentTaskTitle: boardTitle,
            projectTitle: workspaceName,
            source: "BOARD_CARD",
          }),
        }
      });
    }
  } else {
    await db.boardCard.update({ where: { id: cardId }, data: { isCompleted: false } });
  }

  revalidatePath("/board");
  revalidatePath("/daily-log");
  revalidatePath("/reports");
  return { isCompleted: newCompleted };
}

export async function setIncludeInLogs(cardId: number, include: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardCard.update({ where: { id: cardId }, data: { includeInLogs: include } });
  revalidatePath("/board");
  return { includeInLogs: include };
}

export async function setCardAssignee(cardId: number, userId: number | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardCard.update({ where: { id: cardId }, data: { assignedToUserId: userId } });

  // Notify + email when assigning to someone else
  if (userId && userId !== user.id) {
    const assignee = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    const card = await db.boardCard.findUnique({ where: { id: cardId }, select: { title: true } });

    if (assignee && card) {
      await createNotification(
        userId,
        "TASK_ASSIGNED",
        "Card Assigned",
        `${user.name} assigned you card "${card.title}"`,
        `/board`
      );

      if (assignee.email) {
        await sendNotificationEmail(
          assignee.email,
          `Card Assigned: ${card.title}`,
          "Card Assigned",
          `<strong>${user.name}</strong> assigned you the card <strong>"${card.title}"</strong>.`,
          `/board`
        );
      }
    }
  }

  revalidatePath("/board");
  return { assignedToUserId: userId };
}

export async function setCardDueDate(cardId: number, dueDate: string | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardCard.update({
    where: { id: cardId },
    data: { dueDate: dueDate ? new Date(dueDate) : null },
  });
  revalidatePath("/board");
}

export async function deleteCard(cardId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardCard.delete({ where: { id: cardId } });
  revalidatePath("/board");
}

export async function moveCard(cardId: number, targetListId: number, newPosition: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const targetList = await db.boardList.findUnique({ where: { id: targetListId } });
  if (!targetList) throw new Error("Target list is restricted");

  const card = await db.boardCard.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("Card not found");

  const sourceListId = card.listId;

  // Move the card
  await db.boardCard.update({ where: { id: cardId }, data: { listId: targetListId, position: newPosition } });

  // Reindex source list (if different)
  if (sourceListId !== targetListId) {
    const sourceCards = await db.boardCard.findMany({
      where: { listId: sourceListId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (let idx = 0; idx < sourceCards.length; idx++) {
      await db.boardCard.update({ where: { id: sourceCards[idx].id }, data: { position: idx } });
    }
  }

  // Reindex target list
  const targetCards = await db.boardCard.findMany({
    where: { listId: targetListId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const targetIds = targetCards.map(c => c.id).filter(id => id !== cardId);
  targetIds.splice(newPosition, 0, cardId);
  for (let idx = 0; idx < targetIds.length; idx++) {
    await db.boardCard.update({ where: { id: targetIds[idx] }, data: { position: idx } });
  }

  revalidatePath("/board");
}

/**
 * CARD LABELS
 */

export async function addCardLabel(cardId: number, name: string, color: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const label = await db.boardCardLabel.create({ data: { cardId, name, color } });
  revalidatePath("/board");
  return label;
}

export async function removeCardLabel(labelId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardCardLabel.delete({ where: { id: labelId } });
  revalidatePath("/board");
}

/**
 * CARD MEMBERS
 */

export async function addCardMember(cardId: number, userId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const existing = await db.boardCardMember.findUnique({ where: { cardId_userId: { cardId, userId } } });
  if (existing) return existing;

  const member = await db.boardCardMember.create({ data: { cardId, userId } });
  revalidatePath("/board");
  return member;
}

export async function removeCardMember(cardId: number, userId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardCardMember.delete({ where: { cardId_userId: { cardId, userId } } });
  revalidatePath("/board");
}

/**
 * CARD CHECKLISTS
 */

export async function addChecklist(cardId: number, title: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const maxPos = await db.boardChecklist.aggregate({ where: { cardId }, _max: { position: true } });
  const nextPos = (maxPos._max.position ?? -1) + 1;

  const checklist = await db.boardChecklist.create({
    data: { cardId, title, position: nextPos },
  });

  revalidatePath("/board");
  return checklist;
}

export async function deleteChecklist(checklistId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardChecklist.delete({ where: { id: checklistId } });
  revalidatePath("/board");
}

export async function addChecklistItem(checklistId: number, title: string, assignedUserId?: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const assigneeId = assignedUserId || user.id;

  const maxPos = await db.boardChecklistItem.aggregate({ where: { checklistId }, _max: { position: true } });
  const nextPos = (maxPos._max.position ?? -1) + 1;

  const item = await db.boardChecklistItem.create({
    data: { checklistId, title, position: nextPos, assignedUserId: assigneeId },
  });

  // Notify + email only when assigning to someone else
  if (assigneeId !== user.id) {
    const assignee = await db.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } });
    const checklist = await db.boardChecklist.findUnique({ where: { id: checklistId }, include: { card: true } });
    const cardTitle = checklist?.card?.title || "a card";

    if (assignee) {
      await createNotification(
        assigneeId,
        "TASK_ASSIGNED",
        "Checklist Item Assigned",
        `${user.name} assigned you: "${title}" on card "${cardTitle}"`,
        `/board`
      );

      if (assignee.email) {
        await sendNotificationEmail(
          assignee.email,
          `Checklist Item Assigned: ${title}`,
          "Checklist Item Assigned",
          `<strong>${user.name}</strong> assigned you a checklist item on card <strong>"${cardTitle}"</strong>: <strong>${title}</strong>.`,
          `/board`
        );
      }
    }
  }

  revalidatePath("/board");
  return item;
}

export async function toggleChecklistItem(itemId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const item = await db.boardChecklistItem.findUnique({
    where: { id: itemId },
    include: { checklist: { include: { card: { include: { list: { include: { board: { include: { workspace: true } } } } } } } } }
  });
  if (!item) throw new Error("Item not found");

  if (item.assignedUserId && item.assignedUserId !== user.id) {
    throw new Error("Only the assigned person can mark this item as done");
  }

  const newDone = !item.isDone;
  await db.boardChecklistItem.update({ where: { id: itemId }, data: { isDone: newDone } });

  if (newDone) {
    const card = item.checklist.card;
    const logUserId = item.assignedUserId || card.assignedToUserId;
    if (card.includeInLogs && logUserId) {
      const boardTitle = card.list.board.title;
      const workspaceName = card.list.board.workspace?.name || boardTitle;
      await db.activityLog.create({
        data: {
          type: "COMMENTED",
          description: "Board checklist item completed",
          userId: logUserId,
          metadata: JSON.stringify({
            kind: "DAILY_LOG",
            note: `Completed: ${card.title} > ${item.title}`,
            markCompleted: true,
            taskTitle: `${card.title} > ${item.title}`,
            parentTaskTitle: boardTitle,
            projectTitle: workspaceName,
            source: "BOARD_CHECKLIST",
          }),
        }
      });
    }
  }

  revalidatePath("/board");
  revalidatePath("/daily-log");
  revalidatePath("/reports");
  return { isDone: newDone };
}

export async function deleteChecklistItem(itemId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardChecklistItem.delete({ where: { id: itemId } });
  revalidatePath("/board");
}

/**
 * CARD ATTACHMENTS
 */

export async function addCardAttachment(cardId: number, name: string, url: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const attachment = await db.boardCardAttachment.create({ data: { cardId, name, url } });
  revalidatePath("/board");
  return attachment;
}

export async function deleteCardAttachment(attachmentId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardCardAttachment.delete({ where: { id: attachmentId } });
  revalidatePath("/board");
}

/**
 * CARD ACTIVITY
 */

export async function addCardActivity(cardId: number, message: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const activity = await db.boardCardActivity.create({
    data: { cardId, type: "COMMENT", actorName: user.name, message },
  });

  revalidatePath("/board");
  return activity;
}

/**
 * BOARD BACKGROUND
 */
export async function updateBoardBackground(boardId: number, background: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.board.update({ where: { id: boardId }, data: { background } });
  revalidatePath("/board");
}

/**
 * CHECKLIST RENAME
 */
export async function renameChecklist(checklistId: number, title: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.boardChecklist.update({ where: { id: checklistId }, data: { title } });
  revalidatePath("/board");
}
