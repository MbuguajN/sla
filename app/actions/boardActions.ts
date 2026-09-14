"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { BoardVisibility } from "@prisma/client";
import { createNotification } from "./notificationActions";
import { sendNotificationEmail } from "@/lib/email";
import { syncCardToTask, syncChecklistItemToSubtask } from "./boardTaskSync";
import { cardCompletionBlocker, checklistItemCompletionBlocker } from "@/lib/boardRules";
import { runAction, unauthenticated, forbidden, notFound, invalid } from "@/lib/actionResult";

/**
 * FETCHING
 */

export async function getWorkspaces() {
  return runAction("getWorkspaces", async () => {
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
  });
}

export async function getBoard(boardId: number) {
  return runAction("getBoard", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

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
                members: true,
                task: {
                  select: {
                    id: true,
                    status: true,
                    assignedUserId: true,
                  },
                },
              }
            }
          }
        }
      }
    });

    if (!board) return null;

    const isOwner = board.workspace.ownerId === user.id;
    const isAdmin = user.role === "ADMIN" || user.role === "CEO";
    const isMember = board.workspace.members.length > 0;

    if (!isOwner && !isAdmin && !isMember) throw unauthenticated();

    return board;
  });
}

/**
 * MUTATIONS
 */

export async function createWorkspace(data: { name: string; description?: string }) {
  return runAction("createWorkspace", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

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
  });
}

export async function deleteWorkspace(workspaceId: number) {
  return runAction("deleteWorkspace", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) throw notFound("That workspace no longer exists. Refresh the page.");
    if (ws.ownerId !== user.id && user.role !== "ADMIN" && user.role !== "CEO") throw forbidden("Only the workspace owner can delete it.");

    await db.workspace.delete({ where: { id: workspaceId } });
    revalidatePath("/board");
  });
}

export async function createBoard(data: {
  workspaceId: number; 
  title: string; 
  background?: string; 
  visibility?: BoardVisibility 
}) {
  return runAction("createBoard", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

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

    if (!ws) throw forbidden("You are not a member of this workspace, so you cannot create boards in it.");

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
  });
}

/**
 * BOARD MEMBERS
 */

export async function getBoardMembers(boardId: number) {
  return runAction("getBoardMembers", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const members = await db.boardMember.findMany({
      where: { boardId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return members;
  });
}

export async function inviteToBoard(boardId: number, userId: number) {
  return runAction("inviteToBoard", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const board = await db.board.findUnique({ where: { id: boardId }, include: { workspace: true } });
    if (!board) throw notFound("That board no longer exists. Refresh the page.");

    const isWsOwner = board.workspace.ownerId === user.id;
    const isWsMember = await db.workspaceMember.findFirst({ where: { workspaceId: board.workspaceId, userId: user.id } });
    if (!isWsOwner && !isWsMember) throw unauthenticated();

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
  });
}

export async function removeBoardMember(boardId: number, userId: number) {
  return runAction("removeBoardMember", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const board = await db.board.findUnique({ where: { id: boardId }, include: { workspace: true } });
    if (!board) throw notFound("That board no longer exists. Refresh the page.");

    if (board.workspace.ownerId !== user.id && user.role !== "ADMIN" && user.role !== "CEO") throw unauthenticated();

    await db.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
    revalidatePath("/board");
  });
}

/**
 * FULL BOARD DATA (lists + cards with all relations)
 */

export async function getBoardData(boardId: number) {
  return runAction("getBoardData", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

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
    const isAdmin = user.role === "ADMIN" || user.role === "CEO";
    const isWsMember = board.workspace.members.some((m: any) => m.userId === user.id);
    const isBoardMember = board.members.some((m: any) => m.userId === user.id);

    // Workspace owner or admin always has access
    if (isOwner || isAdmin) return board;

    // Board members always have access
    if (isBoardMember) return board;

    // PUBLIC visibility: any workspace member can view
    if (board.visibility === "PUBLIC" && isWsMember) return board;

    // WORKSPACE visibility: workspace members can view
    if (board.visibility === "WORKSPACE" && isWsMember) return board;

    // Otherwise: no access
    throw unauthenticated();
  });
}

/**
 * RECORD BOARD VISIT
 */

export async function recordBoardVisit(boardId: number) {
  return runAction("recordBoardVisit", async () => {
    const user = await getCurrentUser();
    if (!user) return;

    await db.boardVisit.upsert({
      where: { boardId_userId: { boardId, userId: user.id } },
      update: { visitedAt: new Date() },
      create: { boardId, userId: user.id },
    });
  });
}

/**
 * TOGGLE BOARD STAR
 */

export async function toggleBoardStar(boardId: number) {
  return runAction("toggleBoardStar", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const board = await db.board.findUnique({ where: { id: boardId } });
    if (!board) throw notFound("That board no longer exists. Refresh the page.");

    await db.board.update({ where: { id: boardId }, data: { isStarred: !board.isStarred } });
    revalidatePath("/board");
    return { isStarred: !board.isStarred };
  });
}

export async function deleteBoard(boardId: number) {
  return runAction("deleteBoard", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const board = await db.board.findUnique({ where: { id: boardId }, include: { workspace: true } });
    if (!board) throw notFound("That board no longer exists. Refresh the page.");
    if (board.workspace.ownerId !== user.id && user.role !== "ADMIN" && user.role !== "CEO") throw forbidden("Only the workspace owner can delete this board.");

    await db.board.delete({ where: { id: boardId } });
    revalidatePath("/board");
  });
}

export async function updateBoardVisibility(boardId: number, visibility: BoardVisibility) {
  return runAction("updateBoardVisibility", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const board = await db.board.findUnique({ where: { id: boardId }, include: { workspace: true } });
    if (!board) throw notFound("That board no longer exists. Refresh the page.");
    if (board.workspace.ownerId !== user.id && user.role !== "ADMIN" && user.role !== "CEO") throw forbidden("Only the workspace owner can change who can see this board.");

    await db.board.update({ where: { id: boardId }, data: { visibility } });
    revalidatePath("/board");
  });
}

/**
 * LIST MUTATIONS
 */

export async function createList(boardId: number, title: string) {
  return runAction("createList", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const maxPos = await db.boardList.aggregate({ where: { boardId }, _max: { position: true } });
    const nextPos = (maxPos._max.position ?? -1) + 1;

    const list = await db.boardList.create({
      data: { boardId, title, position: nextPos, createdById: user.id },
    });

    revalidatePath("/board");
    return list;
  });
}

export async function renameList(listId: number, title: string) {
  return runAction("renameList", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const list = await db.boardList.findUnique({ where: { id: listId } });
    if (!list) throw notFound("That list no longer exists. Refresh the page.");
    if (list.isRestricted) throw forbidden("This list is locked. Unlock it from the list menu before making changes.");

    const isCreator = list.createdById === user.id;
    const board = await db.board.findUnique({ where: { id: list.boardId }, include: { workspace: true } });
    const isWsOwner = board?.workspace.ownerId === user.id || user.role === "ADMIN" || user.role === "CEO";
    if (!isCreator && !isWsOwner) throw unauthenticated();

    await db.boardList.update({ where: { id: listId }, data: { title } });
    revalidatePath("/board");
  });
}

export async function deleteList(listId: number) {
  return runAction("deleteList", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const list = await db.boardList.findUnique({ where: { id: listId } });
    if (!list) throw notFound("That list no longer exists. Refresh the page.");

    const isCreator = list.createdById === user.id;
    const board = await db.board.findUnique({ where: { id: list.boardId }, include: { workspace: true } });
    const isWsOwner = board?.workspace.ownerId === user.id || user.role === "ADMIN" || user.role === "CEO";
    if (!isCreator && !isWsOwner) throw unauthenticated();

    await db.boardList.delete({ where: { id: listId } });
    revalidatePath("/board");
  });
}

export async function toggleListRestrict(listId: number) {
  return runAction("toggleListRestrict", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const list = await db.boardList.findUnique({ where: { id: listId } });
    if (!list) throw notFound("That list no longer exists. Refresh the page.");

    const isCreator = list.createdById === user.id;
    const board = await db.board.findUnique({ where: { id: list.boardId }, include: { workspace: true } });
    const isWsOwner = board?.workspace.ownerId === user.id || user.role === "ADMIN" || user.role === "CEO";
    if (!isCreator && !isWsOwner) throw unauthenticated();

    await db.boardList.update({ where: { id: listId }, data: { isRestricted: !list.isRestricted } });
    revalidatePath("/board");
    return { isRestricted: !list.isRestricted };
  });
}

export async function moveList(listId: number, newPosition: number) {
  return runAction("moveList", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const list = await db.boardList.findUnique({ where: { id: listId } });
    if (!list) throw notFound("That list no longer exists. Refresh the page.");

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
  });
}

/**
 * CARD MUTATIONS
 */

export async function createCard(listId: number, title: string) {
  return runAction("createCard", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const list = await db.boardList.findUnique({ where: { id: listId } });
    if (!list) throw notFound("That list no longer exists. Refresh the page.");
    if (list.isRestricted) throw forbidden("This list is locked. Unlock it from the list menu before making changes.");

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

    const fullCard = await db.boardCard.findUnique({
      where: { id: card.id },
      include: { list: { include: { board: true } } },
    });
    if (fullCard?.list.board.projectId) {
      await syncCardToTask(card.id).catch(() => {});
    }

    revalidatePath("/board");
    return card;
  });
}

export async function updateCardTitle(cardId: number, title: string) {
  return runAction("updateCardTitle", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardCard.update({ where: { id: cardId }, data: { title } });
    revalidatePath("/board");
  });
}

export async function updateCardDescription(cardId: number, description: string) {
  return runAction("updateCardDescription", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardCard.update({ where: { id: cardId }, data: { description } });
    revalidatePath("/board");
  });
}

export async function toggleCardComplete(cardId: number) {
  return runAction("toggleCardComplete", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const card = await db.boardCard.findUnique({
      where: { id: cardId },
      include: {
        checklists: { include: { items: true } },
        list: { include: { board: { include: { workspace: true } } } }
      }
    });
    if (!card) throw notFound("That card no longer exists. Refresh the page.");

    const newCompleted = !card.isCompleted;

    if (newCompleted) {
      const blocker = cardCompletionBlocker(
        {
          assignedToUserId: card.assignedToUserId,
          checklistItems: card.checklists.flatMap((cl) => cl.items),
        },
        user.id
      );
      if (blocker) throw invalid(blocker);

      await db.boardCard.update({ where: { id: cardId }, data: { isCompleted: true } });

      if (card.taskId) {
        await db.task.update({
          where: { id: card.taskId },
          data: { status: "DONE", completedAt: new Date() },
        }).catch(() => {});
      }

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
    } else {
      await db.boardCard.update({ where: { id: cardId }, data: { isCompleted: false } });

      if (card.taskId) {
        await db.task.update({
          where: { id: card.taskId },
          // Reopening must not claim the task is assigned when it has no assignee.
          data: {
            status: card.assignedToUserId ? "ASSIGNED" : "UNASSIGNED",
            completedAt: null,
          },
        }).catch(() => {});
      }
    }

    revalidatePath("/board");
    revalidatePath("/daily-log");
    revalidatePath("/reports");
    return { isCompleted: newCompleted };
  });
}

export async function setCardAssignee(cardId: number, userId: number | null) {
  return runAction("setCardAssignee", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardCard.update({ where: { id: cardId }, data: { assignedToUserId: userId } });

    // Sync assignee to linked Task
    try {
      const cardWithBoard = await db.boardCard.findUnique({
        where: { id: cardId },
        include: { list: { include: { board: { select: { projectId: true } } } } },
      });
      if (cardWithBoard?.taskId) {
        await db.task.update({
          where: { id: cardWithBoard.taskId },
          data: { assignedUserId: userId },
        });
        if (cardWithBoard.list.board.projectId) {
          revalidatePath(`/projects/${cardWithBoard.list.board.projectId}`);
        }
      }
    } catch (e) {
      console.error("Failed to sync assignee to task:", e);
    }

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
  });
}

export async function setCardDueDate(cardId: number, dueDate: string | null) {
  return runAction("setCardDueDate", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardCard.update({
      where: { id: cardId },
      data: { dueDate: dueDate ? new Date(dueDate) : null },
    });
    revalidatePath("/board");
  });
}

export async function deleteCard(cardId: number) {
  return runAction("deleteCard", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardCard.delete({ where: { id: cardId } });
    revalidatePath("/board");
  });
}

export async function moveCard(cardId: number, targetListId: number, newPosition: number) {
  return runAction("moveCard", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const targetList = await db.boardList.findUnique({ where: { id: targetListId } });
    if (!targetList) throw notFound("The list you dropped onto no longer exists. Refresh the page.");
    if (targetList.isRestricted) throw forbidden("This list is locked. Unlock it from the list menu before making changes.");

    const card = await db.boardCard.findUnique({ where: { id: cardId } });
    if (!card) throw notFound("That card no longer exists. Refresh the page.");

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
  });
}

/**
 * CARD LABELS
 */

export async function addCardLabel(cardId: number, name: string, color: string) {
  return runAction("addCardLabel", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const label = await db.boardCardLabel.create({ data: { cardId, name, color } });
    revalidatePath("/board");
    return label;
  });
}

export async function removeCardLabel(labelId: number) {
  return runAction("removeCardLabel", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardCardLabel.delete({ where: { id: labelId } });
    revalidatePath("/board");
  });
}

/**
 * CARD MEMBERS
 */

export async function addCardMember(cardId: number, userId: number) {
  return runAction("addCardMember", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const existing = await db.boardCardMember.findUnique({ where: { cardId_userId: { cardId, userId } } });
    if (existing) return existing;

    const member = await db.boardCardMember.create({ data: { cardId, userId } });
    revalidatePath("/board");
    return member;
  });
}

export async function removeCardMember(cardId: number, userId: number) {
  return runAction("removeCardMember", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardCardMember.delete({ where: { cardId_userId: { cardId, userId } } });
    revalidatePath("/board");
  });
}

/**
 * CARD CHECKLISTS
 */

export async function addChecklist(cardId: number, title: string) {
  return runAction("addChecklist", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const maxPos = await db.boardChecklist.aggregate({ where: { cardId }, _max: { position: true } });
    const nextPos = (maxPos._max.position ?? -1) + 1;

    const checklist = await db.boardChecklist.create({
      data: { cardId, title, position: nextPos },
    });

    revalidatePath("/board");
    return checklist;
  });
}

export async function deleteChecklist(checklistId: number) {
  return runAction("deleteChecklist", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardChecklist.delete({ where: { id: checklistId } });
    revalidatePath("/board");
  });
}

export async function addChecklistItem(checklistId: number, title: string, assignedUserId?: number) {
  return runAction("addChecklistItem", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

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

    const fullItem = await db.boardChecklistItem.findUnique({
      where: { id: item.id },
      include: { checklist: { include: { card: true } } },
    });
    if (fullItem?.checklist.card.taskId) {
      await syncChecklistItemToSubtask(item.id).catch(() => {});
    }

    return item;
  });
}

export async function toggleChecklistItem(itemId: number) {
  return runAction("toggleChecklistItem", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const item = await db.boardChecklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: { include: { card: { include: { list: { include: { board: { include: { workspace: true } } } } } } } } }
    });
    if (!item) throw notFound("That checklist item no longer exists. Refresh the page.");

    const newDone = !item.isDone;

    // Only enforce ownership when completing; anyone may reopen a mistake.
    if (newDone) {
      const blocker = checklistItemCompletionBlocker(
        { assignedUserId: item.assignedUserId },
        user.id
      );
      if (blocker) throw invalid(blocker);
    }

    await db.boardChecklistItem.update({ where: { id: itemId }, data: { isDone: newDone } });

    if (item.subtaskId) {
      await db.subtask.update({
        where: { id: item.subtaskId },
        data: { status: newDone ? "DONE" : "PENDING" },
      }).catch(() => {});
    }

    if (newDone) {
      const card = item.checklist.card;
      const logUserId = item.assignedUserId || card.assignedToUserId;
      if (logUserId) {
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
  });
}

export async function deleteChecklistItem(itemId: number) {
  return runAction("deleteChecklistItem", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardChecklistItem.delete({ where: { id: itemId } });
    revalidatePath("/board");
  });
}

/**
 * Reassign an existing checklist item. Without this, an item created with no
 * assignee (or inherited from a synced subtask) could never be completed, since
 * completion now requires one.
 */
export async function setChecklistItemAssignee(itemId: number, userId: number | null) {
  return runAction("setChecklistItemAssignee", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const item = await db.boardChecklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: { include: { card: true } } },
    });
    if (!item) throw notFound("That checklist item no longer exists. Refresh the page.");

    if (userId) {
      const assignee = await db.user.findFirst({
        where: { id: userId, isActive: true },
        select: { id: true, name: true, email: true },
      });
      if (!assignee) throw notFound("That person is no longer an active user.");

      await db.boardChecklistItem.update({
        where: { id: itemId },
        data: { assignedUserId: userId },
      });

      // Same notify + email shape as addChecklistItem, skipped for self-assignment.
      if (userId !== user.id) {
        const cardTitle = item.checklist.card.title;

        await createNotification(
          userId,
          "TASK_ASSIGNED",
          "Checklist Item Assigned",
          `${user.name} assigned you: "${item.title}" on card "${cardTitle}"`,
          `/board`
        ).catch((e) => console.error("Failed to notify checklist assignee:", e));

        if (assignee.email) {
          await sendNotificationEmail(
            assignee.email,
            `Checklist Item Assigned: ${item.title}`,
            "Checklist Item Assigned",
            `<strong>${user.name}</strong> assigned you a checklist item on card <strong>"${cardTitle}"</strong>: <strong>${item.title}</strong>.`,
            `/board`
          );
        }
      }
    } else {
      // Clearing the assignee also reopens the item — an unassigned item must not
      // stay in a completed state it can no longer be credited to anyone.
      await db.boardChecklistItem.update({
        where: { id: itemId },
        data: { assignedUserId: null, isDone: false },
      });

      if (item.subtaskId) {
        await db.subtask
          .update({ where: { id: item.subtaskId }, data: { status: "PENDING" } })
          .catch(() => {});
      }
    }

    revalidatePath("/board");
    revalidatePath("/daily-log");
    return { assignedUserId: userId };
  });
}

export async function updateChecklistItem(itemId: number, title: string) {
  return runAction("updateChecklistItem", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardChecklistItem.update({ where: { id: itemId }, data: { title: title.trim() } });
    revalidatePath("/board");
  });
}

/**
 * CARD ATTACHMENTS
 */

export async function addCardAttachment(cardId: number, name: string, url: string) {
  return runAction("addCardAttachment", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const attachment = await db.boardCardAttachment.create({ data: { cardId, name, url } });
    revalidatePath("/board");
    return attachment;
  });
}

export async function deleteCardAttachment(attachmentId: number) {
  return runAction("deleteCardAttachment", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardCardAttachment.delete({ where: { id: attachmentId } });
    revalidatePath("/board");
  });
}

/**
 * CARD ACTIVITY
 */

export async function addCardActivity(cardId: number, message: string) {
  return runAction("addCardActivity", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    const activity = await db.boardCardActivity.create({
      data: { cardId, type: "COMMENT", actorName: user.name, message },
    });

    revalidatePath("/board");
    return activity;
  });
}

/**
 * BOARD BACKGROUND
 */
export async function updateBoardBackground(boardId: number, background: string) {
  return runAction("updateBoardBackground", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.board.update({ where: { id: boardId }, data: { background } });
    revalidatePath("/board");
  });
}

/**
 * CHECKLIST RENAME
 */
export async function renameChecklist(checklistId: number, title: string) {
  return runAction("renameChecklist", async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();

    await db.boardChecklist.update({ where: { id: checklistId }, data: { title } });
    revalidatePath("/board");
  });
}
