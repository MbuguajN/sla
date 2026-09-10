"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { BoardMemberRole, BoardVisibility } from "@prisma/client";
import { createNotification } from "./notificationActions";
import { sendNotificationEmail } from "@/lib/email";
import { syncCardToTask, syncChecklistItemToSubtask } from "./boardTaskSync";
import { cardCompletionBlocker, checklistItemCompletionBlocker } from "@/lib/boardRules";
import {
  assertBoardAccess,
  assertCardAccess,
  assertCardAttachmentAccess,
  assertCardLabelAccess,
  assertChecklistAccess,
  assertChecklistItemAccess,
  assertListAccess,
  assertWorkspaceAccess,
  getBoardAccess,
  hasLevel,
} from "@/lib/boardAccess";

/** Deep link to a board. The client keys boards as `b-<id>`, so links must match. */
function boardLink(boardId: number) {
  return `/board?active=b-${boardId}`;
}

/**
 * A user's personal space: the home for boards that are theirs alone. Created on
 * first use so nobody has to pick a workspace to make a private board.
 */
export async function ensurePersonalWorkspace() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const existing = await db.workspace.findFirst({
    where: { ownerId: user.id, isPersonal: true },
  });
  if (existing) return existing;

  return db.workspace.create({
    data: {
      name: `${user.name}'s space`,
      description: "Your personal boards. Only you can see these unless you share them.",
      ownerId: user.id,
      isPersonal: true,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
}

/**
 * FETCHING
 */

export async function getWorkspaces() {
  const user = await getCurrentUser();
  if (!user) return [];

  const isPlatformAdmin = user.role === "ADMIN" || user.role === "CEO";

  // Which boards this user may see. Mirrors lib/boardAccess.ts.
  const boardWhere = isPlatformAdmin
    ? {}
    : {
        OR: [
          { workspace: { ownerId: user.id } },
          { members: { some: { userId: user.id } } },
          { visibility: BoardVisibility.WORKSPACE, workspace: { members: { some: { userId: user.id } } } },
          { visibility: BoardVisibility.PUBLIC },
        ],
      };

  // Which workspaces to surface: ones the user belongs to, plus any that hold a
  // board they can reach (board membership or an org-wide PUBLIC board).
  const reachableWorkspaces = isPlatformAdmin
    ? {}
    : {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
          { boards: { some: { members: { some: { userId: user.id } } } } },
          { boards: { some: { visibility: BoardVisibility.PUBLIC } } },
        ],
      };

  // Someone else's personal space is never listed, not even for admins.
  const workspaceWhere = {
    AND: [
      reachableWorkspaces,
      { OR: [{ isPersonal: false }, { ownerId: user.id }] },
    ],
  };

  const workspaces = await db.workspace.findMany({
    where: workspaceWhere,
    include: {
      boards: {
        orderBy: { updatedAt: "desc" },
        where: boardWhere,
        include: {
          visits: {
            where: { userId: user.id },
            take: 1,
            orderBy: { visitedAt: "desc" },
            select: { visitedAt: true },
          },
        },
      },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return workspaces;
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
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
  });

  revalidatePath("/board");
  return workspace;
}

export async function deleteWorkspace(workspaceId: number) {
  await assertWorkspaceAccess(workspaceId, "ADMIN");

  await db.workspace.delete({ where: { id: workspaceId } });
  revalidatePath("/board");
}

export async function createBoard(data: {
  workspaceId?: number;
  personal?: boolean;
  title: string;
  background?: string;
  visibility?: BoardVisibility
}) {
  let workspaceId: number;
  let userId: number;
  let visibility = data.visibility || BoardVisibility.WORKSPACE;

  if (data.personal) {
    // A personal board lives in the caller's own space and starts out private.
    const workspace = await ensurePersonalWorkspace();
    workspaceId = workspace.id;
    userId = workspace.ownerId;
    visibility = data.visibility || BoardVisibility.PRIVATE;
  } else {
    if (!data.workspaceId) throw new Error("Choose a workspace for this board");
    const { user } = await assertWorkspaceAccess(data.workspaceId, "MEMBER");
    workspaceId = data.workspaceId;
    userId = user.id;
  }

  const board = await db.board.create({
    data: {
      workspaceId,
      title: data.title,
      background: data.background || "bg-sky-600",
      visibility,
      createdById: userId,
      // The creator owns the board. Without this a PRIVATE board would be
      // invisible to the person who just made it.
      members: {
        create: { userId, role: BoardMemberRole.OWNER },
      },
    },
  });

  revalidatePath("/board");
  return board;
}

/**
 * WORKSPACE MEMBERS
 */

export async function inviteToWorkspace(workspaceId: number, userId: number) {
  const { user, workspace } = await assertWorkspaceAccess(workspaceId, "MEMBER");

  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (existing) return existing;

  const member = await db.workspaceMember.create({
    data: { workspaceId, userId, role: "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (userId !== user.id) {
    await createNotification(
      userId,
      "WORKSPACE_INVITE",
      "Workspace Invite",
      `${user.name} added you to workspace "${workspace.name}"`,
      "/board"
    );

    if (member.user.email) {
      await sendNotificationEmail(
        member.user.email,
        `You've been added to workspace "${workspace.name}"`,
        "Workspace Invite",
        `<strong>${user.name}</strong> added you to the workspace <strong>"${workspace.name}"</strong>.`,
        "/board"
      );
    }
  }

  revalidatePath("/board");
  return member;
}

export async function removeWorkspaceMember(workspaceId: number, userId: number) {
  const { workspace } = await assertWorkspaceAccess(workspaceId, "ADMIN");

  if (workspace.ownerId === userId) {
    throw new Error("The workspace owner cannot be removed");
  }

  await db.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId, userId } } });
  revalidatePath("/board");
}

/**
 * BOARD MEMBERS
 */

export async function getBoardMembers(boardId: number) {
  await assertBoardAccess(boardId, "VIEW");

  const members = await db.boardMember.findMany({
    where: { boardId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return members;
}

export async function inviteToBoard(
  boardId: number,
  userId: number,
  role: BoardMemberRole = BoardMemberRole.EDITOR
) {
  // On a private board only its owners may hand out access; on shared boards
  // anyone who can edit may invite.
  const access = await getBoardAccess(boardId);
  if (!access) throw new Error("Board not found");
  const required = access.visibility === BoardVisibility.PRIVATE ? "ADMIN" : "EDIT";
  if (!hasLevel(access, required)) {
    throw new Error(
      required === "ADMIN"
        ? "Only the board owner can invite people to a private board"
        : "You do not have permission to invite people to this board"
    );
  }
  const user = access.user;

  const existing = await db.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
  if (existing) return existing;

  const member = await db.boardMember.create({
    data: { boardId, userId, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const roleWord = role === BoardMemberRole.VIEWER ? "as a viewer" : "";

  // In-app notification
  await createNotification(
    userId,
    "BOARD_INVITE",
    "Board Invite",
    `${user.name} added you to board "${access.title}" ${roleWord}`.trim(),
    boardLink(boardId)
  );

  // Email notification
  if (member.user.email) {
    await sendNotificationEmail(
      member.user.email,
      `You've been added to board "${access.title}"`,
      "Board Invite",
      `<strong>${user.name}</strong> added you to the board <strong>"${access.title}"</strong> in workspace <strong>"${access.workspaceName}"</strong>.`,
      boardLink(boardId)
    );
  }

  revalidatePath("/board");
  return member;
}

export async function removeBoardMember(boardId: number, userId: number) {
  await assertBoardAccess(boardId, "ADMIN");

  const owners = await db.boardMember.count({ where: { boardId, role: BoardMemberRole.OWNER } });
  const target = await db.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
  if (!target) return;
  if (target.role === BoardMemberRole.OWNER && owners <= 1) {
    throw new Error("A board needs at least one owner. Promote someone else first.");
  }

  await db.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
  revalidatePath("/board");
}

export async function setBoardMemberRole(boardId: number, userId: number, role: BoardMemberRole) {
  await assertBoardAccess(boardId, "ADMIN");

  const target = await db.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
  if (!target) throw new Error("That person is not a member of this board");
  if (target.role === role) return target;

  // Do not let the last owner demote themselves and lock the board.
  if (target.role === BoardMemberRole.OWNER) {
    const owners = await db.boardMember.count({ where: { boardId, role: BoardMemberRole.OWNER } });
    if (owners <= 1) throw new Error("A board needs at least one owner. Promote someone else first.");
  }

  const updated = await db.boardMember.update({
    where: { boardId_userId: { boardId, userId } },
    data: { role },
  });

  revalidatePath("/board");
  return updated;
}

export async function leaveBoard(boardId: number) {
  const access = await assertBoardAccess(boardId, "VIEW");
  if (!access.isBoardMember) throw new Error("You are not a member of this board");

  if (access.boardMemberRole === BoardMemberRole.OWNER) {
    const owners = await db.boardMember.count({ where: { boardId, role: BoardMemberRole.OWNER } });
    if (owners <= 1) throw new Error("You are the only owner. Promote someone else before leaving.");
  }

  await db.boardMember.delete({
    where: { boardId_userId: { boardId, userId: access.user.id } },
  });
  revalidatePath("/board");
}

/**
 * FULL BOARD DATA (lists + cards with all relations)
 */

export async function getBoardData(boardId: number) {
  const access = await assertBoardAccess(boardId, "VIEW");

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
              task: {
                select: { id: true, status: true, assignedUserId: true },
              },
            }
          }
        }
      }
    }
  });

  if (!board) return null;

  // The client uses this to decide what to render as editable.
  return {
    ...board,
    viewerLevel: access.level,
    viewerRole: access.boardMemberRole,
    viewerCanEdit: hasLevel(access, "EDIT"),
    viewerCanAdmin: hasLevel(access, "ADMIN"),
    isPersonalWorkspace: access.isPersonalWorkspace,
  };
}

/**
 * RECORD BOARD VISIT
 */

export async function recordBoardVisit(boardId: number) {
  const access = await getBoardAccess(boardId);
  if (!access || !hasLevel(access, "VIEW")) return;

  await db.boardVisit.upsert({
    where: { boardId_userId: { boardId, userId: access.user.id } },
    update: { visitedAt: new Date() },
    create: { boardId, userId: access.user.id },
  });
}

/**
 * TOGGLE BOARD STAR
 *
 * NOTE: Board.isStarred is a single board-wide flag, so this is shared by every
 * member rather than per-viewer. Making stars personal needs a BoardStar table.
 */
export async function toggleBoardStar(boardId: number) {
  await assertBoardAccess(boardId, "EDIT");

  const board = await db.board.findUnique({ where: { id: boardId }, select: { isStarred: true } });
  if (!board) throw new Error("Board not found");

  await db.board.update({ where: { id: boardId }, data: { isStarred: !board.isStarred } });
  revalidatePath("/board");
  return { isStarred: !board.isStarred };
}

export async function deleteBoard(boardId: number) {
  await assertBoardAccess(boardId, "ADMIN");

  await db.board.delete({ where: { id: boardId } });
  revalidatePath("/board");
}

export async function renameBoard(boardId: number, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Board title cannot be empty");

  await assertBoardAccess(boardId, "ADMIN");
  await db.board.update({ where: { id: boardId }, data: { title: trimmed } });
  revalidatePath("/board");
  return { title: trimmed };
}

export async function updateBoardVisibility(boardId: number, visibility: BoardVisibility) {
  await assertBoardAccess(boardId, "ADMIN");

  await db.board.update({ where: { id: boardId }, data: { visibility } });
  revalidatePath("/board");
}

/**
 * LIST MUTATIONS
 */

export async function createList(boardId: number, title: string) {
  const access = await assertBoardAccess(boardId, "EDIT");

  const maxPos = await db.boardList.aggregate({ where: { boardId }, _max: { position: true } });
  const nextPos = (maxPos._max.position ?? -1) + 1;

  const list = await db.boardList.create({
    data: { boardId, title, position: nextPos, createdById: access.user.id },
  });

  revalidatePath("/board");
  return list;
}

export async function renameList(listId: number, title: string) {
  const { list, access } = await assertListAccess(listId, "EDIT");
  if (list.isRestricted) throw new Error("This list is restricted");

  const isCreator = list.createdById === access.user.id;
  if (!isCreator && !hasLevel(access, "ADMIN")) throw new Error("Only the list creator or a board owner can rename this list");

  await db.boardList.update({ where: { id: listId }, data: { title } });
  revalidatePath("/board");
}

export async function deleteList(listId: number) {
  const { list, access } = await assertListAccess(listId, "EDIT");
  if (list.isRestricted) throw new Error("This list is restricted");

  const isCreator = list.createdById === access.user.id;
  if (!isCreator && !hasLevel(access, "ADMIN")) throw new Error("Only the list creator or a board owner can delete this list");

  await db.boardList.delete({ where: { id: listId } });
  revalidatePath("/board");
}

export async function toggleListRestrict(listId: number) {
  const { list, access } = await assertListAccess(listId, "EDIT");

  const isCreator = list.createdById === access.user.id;
  if (!isCreator && !hasLevel(access, "ADMIN")) throw new Error("Only the list creator or a board owner can restrict this list");

  await db.boardList.update({ where: { id: listId }, data: { isRestricted: !list.isRestricted } });
  revalidatePath("/board");
  return { isRestricted: !list.isRestricted };
}

export async function moveList(listId: number, newPosition: number) {
  const { list } = await assertListAccess(listId, "EDIT");

  const allLists = await db.boardList.findMany({
    where: { boardId: list.boardId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  const ids = allLists.map(l => l.id).filter(id => id !== listId);
  const target = Math.max(0, Math.min(newPosition, ids.length));
  ids.splice(target, 0, listId);

  // One transaction so a concurrent drag cannot interleave with this reindex.
  await db.$transaction(
    ids.map((id, idx) => db.boardList.update({ where: { id }, data: { position: idx } }))
  );

  revalidatePath("/board");
}

/**
 * CARD MUTATIONS
 */

export async function createCard(listId: number, title: string) {
  const { list, access } = await assertListAccess(listId, "EDIT");
  if (list.isRestricted) throw new Error("This list is restricted");

  const maxPos = await db.boardCard.aggregate({ where: { listId }, _max: { position: true } });
  const nextPos = (maxPos._max.position ?? -1) + 1;

  const card = await db.boardCard.create({
    data: { listId, title, position: nextPos },
  });

  await db.boardCardMember.create({
    data: { cardId: card.id, userId: access.user.id },
  });

  await db.boardCardActivity.create({
    data: { cardId: card.id, type: "SYSTEM", actorName: "System", message: "Card created" },
  });

  const board = await db.board.findUnique({
    where: { id: list.boardId },
    select: { projectId: true },
  });
  if (board?.projectId) {
    await syncCardToTask(card.id).catch(() => {});
  }

  revalidatePath("/board");
  return card;
}

export async function updateCardTitle(cardId: number, title: string) {
  const { card } = await assertCardAccess(cardId, "EDIT");
  if (card.list.isRestricted) throw new Error("This list is restricted");

  await db.boardCard.update({ where: { id: cardId }, data: { title } });
  revalidatePath("/board");
}

export async function updateCardDescription(cardId: number, description: string) {
  const { card } = await assertCardAccess(cardId, "EDIT");
  if (card.list.isRestricted) throw new Error("This list is restricted");

  await db.boardCard.update({ where: { id: cardId }, data: { description } });
  revalidatePath("/board");
}

export async function toggleCardComplete(cardId: number) {
  const { access } = await assertCardAccess(cardId, "EDIT");
  const user = access.user;

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
    const blocker = cardCompletionBlocker(
      {
        assignedToUserId: card.assignedToUserId,
        checklistItems: card.checklists.flatMap((cl) => cl.items),
      },
      user.id
    );
    if (blocker) throw new Error(blocker);

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

  await db.boardCardActivity.create({
    data: {
      cardId,
      type: "SYSTEM",
      actorName: user.name,
      message: newCompleted ? "marked this card complete" : "reopened this card",
    },
  });

  revalidatePath("/board");
  revalidatePath("/daily-log");
  revalidatePath("/reports");
  return { isCompleted: newCompleted };
}

export async function setCardAssignee(cardId: number, userId: number | null) {
  const { card, access } = await assertCardAccess(cardId, "EDIT");
  if (card.list.isRestricted) throw new Error("This list is restricted");
  const user = access.user;

  await db.boardCard.update({ where: { id: cardId }, data: { assignedToUserId: userId } });

  // Sync assignee to linked Task
  try {
    if (card.taskId) {
      await db.task.update({
        where: { id: card.taskId },
        data: { assignedUserId: userId },
      });
      const board = await db.board.findUnique({
        where: { id: access.boardId },
        select: { projectId: true },
      });
      if (board?.projectId) {
        revalidatePath(`/projects/${board.projectId}`);
      }
    }
  } catch (e) {
    console.error("Failed to sync assignee to task:", e);
  }

  await db.boardCardActivity.create({
    data: {
      cardId,
      type: "SYSTEM",
      actorName: user.name,
      message: userId ? "changed the assignee" : "cleared the assignee",
    },
  });

  // Notify + email when assigning to someone else
  if (userId && userId !== user.id) {
    const assignee = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });

    if (assignee) {
      await createNotification(
        userId,
        "TASK_ASSIGNED",
        "Card Assigned",
        `${user.name} assigned you card "${card.title}"`,
        boardLink(access.boardId)
      );

      if (assignee.email) {
        await sendNotificationEmail(
          assignee.email,
          `Card Assigned: ${card.title}`,
          "Card Assigned",
          `<strong>${user.name}</strong> assigned you the card <strong>"${card.title}"</strong> on board <strong>"${access.title}"</strong>.`,
          boardLink(access.boardId)
        );
      }
    }
  }

  revalidatePath("/board");
  return { assignedToUserId: userId };
}

export async function setCardDueDate(cardId: number, dueDate: string | null) {
  const { card } = await assertCardAccess(cardId, "EDIT");
  if (card.list.isRestricted) throw new Error("This list is restricted");

  await db.boardCard.update({
    where: { id: cardId },
    data: { dueDate: dueDate ? new Date(dueDate) : null },
  });
  revalidatePath("/board");
}

export async function deleteCard(cardId: number) {
  const { card } = await assertCardAccess(cardId, "EDIT");
  if (card.list.isRestricted) throw new Error("This list is restricted");

  await db.boardCard.delete({ where: { id: cardId } });
  revalidatePath("/board");
}

export async function moveCard(cardId: number, targetListId: number, newPosition: number) {
  const { card, access } = await assertCardAccess(cardId, "EDIT");
  if (card.list.isRestricted) throw new Error("This list is restricted");

  const targetList = await db.boardList.findUnique({
    where: { id: targetListId },
    select: { id: true, boardId: true, isRestricted: true },
  });
  if (!targetList) throw new Error("Target list not found");
  if (targetList.isRestricted) throw new Error("The target list is restricted");
  if (targetList.boardId !== access.boardId) throw new Error("Cannot move a card to a different board");

  const sourceListId = card.listId;

  const targetCards = await db.boardCard.findMany({
    where: { listId: targetListId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const targetIds = targetCards.map(c => c.id).filter(id => id !== cardId);
  const insertAt = Math.max(0, Math.min(newPosition, targetIds.length));
  targetIds.splice(insertAt, 0, cardId);

  const sourceIds =
    sourceListId === targetListId
      ? []
      : (
          await db.boardCard.findMany({
            where: { listId: sourceListId, id: { not: cardId } },
            orderBy: { position: "asc" },
            select: { id: true },
          })
        ).map(c => c.id);

  // Move + reindex both lists atomically.
  await db.$transaction([
    db.boardCard.update({ where: { id: cardId }, data: { listId: targetListId } }),
    ...sourceIds.map((id, idx) => db.boardCard.update({ where: { id }, data: { position: idx } })),
    ...targetIds.map((id, idx) => db.boardCard.update({ where: { id }, data: { position: idx } })),
  ]);

  revalidatePath("/board");
}

/**
 * CARD LABELS
 */

export async function addCardLabel(cardId: number, name: string, color: string) {
  await assertCardAccess(cardId, "EDIT");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Label name cannot be empty");

  // Adding a label the card already carries is a no-op rather than a duplicate.
  const existing = await db.boardCardLabel.findFirst({
    where: { cardId, name: trimmed, color },
  });
  if (existing) return existing;

  const label = await db.boardCardLabel.create({ data: { cardId, name: trimmed, color } });
  revalidatePath("/board");
  return label;
}

export async function removeCardLabel(labelId: number) {
  await assertCardLabelAccess(labelId, "EDIT");

  await db.boardCardLabel.delete({ where: { id: labelId } });
  revalidatePath("/board");
}

/**
 * CARD MEMBERS
 */

export async function addCardMember(cardId: number, userId: number) {
  const { access } = await assertCardAccess(cardId, "EDIT");

  // A card member who cannot open the board would see nothing, so joining a
  // card grants board membership too.
  await db.boardMember.upsert({
    where: { boardId_userId: { boardId: access.boardId, userId } },
    create: { boardId: access.boardId, userId, role: BoardMemberRole.EDITOR },
    update: {},
  });

  const existing = await db.boardCardMember.findUnique({ where: { cardId_userId: { cardId, userId } } });
  if (existing) return existing;

  const member = await db.boardCardMember.create({ data: { cardId, userId } });
  revalidatePath("/board");
  return member;
}

export async function removeCardMember(cardId: number, userId: number) {
  await assertCardAccess(cardId, "EDIT");

  await db.boardCardMember.delete({ where: { cardId_userId: { cardId, userId } } });
  revalidatePath("/board");
}

/**
 * CARD CHECKLISTS
 */

export async function addChecklist(cardId: number, title: string) {
  await assertCardAccess(cardId, "EDIT");

  const maxPos = await db.boardChecklist.aggregate({ where: { cardId }, _max: { position: true } });
  const nextPos = (maxPos._max.position ?? -1) + 1;

  const checklist = await db.boardChecklist.create({
    data: { cardId, title, position: nextPos },
  });

  revalidatePath("/board");
  return checklist;
}

export async function deleteChecklist(checklistId: number) {
  await assertChecklistAccess(checklistId, "EDIT");

  await db.boardChecklist.delete({ where: { id: checklistId } });
  revalidatePath("/board");
}

export async function addChecklistItem(checklistId: number, title: string, assignedUserId?: number) {
  const { checklist, access } = await assertChecklistAccess(checklistId, "EDIT");
  const user = access.user;

  const assigneeId = assignedUserId || user.id;

  const maxPos = await db.boardChecklistItem.aggregate({ where: { checklistId }, _max: { position: true } });
  const nextPos = (maxPos._max.position ?? -1) + 1;

  const item = await db.boardChecklistItem.create({
    data: { checklistId, title, position: nextPos, assignedUserId: assigneeId },
  });

  // Notify + email only when assigning to someone else
  if (assigneeId !== user.id) {
    const assignee = await db.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } });
    const cardTitle = checklist.card.title || "a card";

    if (assignee) {
      await createNotification(
        assigneeId,
        "TASK_ASSIGNED",
        "Checklist Item Assigned",
        `${user.name} assigned you: "${title}" on card "${cardTitle}"`,
        boardLink(access.boardId)
      );

      if (assignee.email) {
        await sendNotificationEmail(
          assignee.email,
          `Checklist Item Assigned: ${title}`,
          "Checklist Item Assigned",
          `<strong>${user.name}</strong> assigned you a checklist item on card <strong>"${cardTitle}"</strong>: <strong>${title}</strong>.`,
          boardLink(access.boardId)
        );
      }
    }
  }

  revalidatePath("/board");

  if (checklist.card.taskId) {
    await syncChecklistItemToSubtask(item.id).catch(() => {});
  }

  return item;
}

export async function toggleChecklistItem(itemId: number) {
  const { item, access } = await assertChecklistItemAccess(itemId, "EDIT");
  const user = access.user;

  const newDone = !item.isDone;

  // Only enforce ownership when completing; anyone may reopen a mistake.
  if (newDone) {
    const blocker = checklistItemCompletionBlocker(
      { assignedUserId: item.assignedUserId },
      user.id
    );
    if (blocker) throw new Error(blocker);
  }

  await db.boardChecklistItem.update({ where: { id: itemId }, data: { isDone: newDone } });

  if (item.subtaskId) {
    await db.subtask.update({
      where: { id: item.subtaskId },
      data: { status: newDone ? "DONE" : "PENDING" },
    }).catch(() => {});
  }

  if (newDone) {
    const card = await db.boardCard.findUnique({
      where: { id: item.checklist.card.id },
      select: {
        title: true,
        assignedToUserId: true,
        list: { select: { board: { select: { title: true, workspace: { select: { name: true } } } } } },
      },
    });

    const logUserId = item.assignedUserId || card?.assignedToUserId;
    if (card && logUserId) {
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
  await assertChecklistItemAccess(itemId, "EDIT");

  await db.boardChecklistItem.delete({ where: { id: itemId } });
  revalidatePath("/board");
}

/**
 * Reassign an existing checklist item. Without this, an item created with no
 * assignee (or inherited from a synced subtask) could never be completed, since
 * completion now requires one.
 */
export async function setChecklistItemAssignee(itemId: number, userId: number | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const item = await db.boardChecklistItem.findUnique({
    where: { id: itemId },
    include: { checklist: { include: { card: true } } },
  });
  if (!item) throw new Error("Item not found");

  if (userId) {
    const assignee = await db.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true, name: true, email: true },
    });
    if (!assignee) throw new Error("Assignee not found");

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
}

export async function updateChecklistItem(itemId: number, title: string) {
  await assertChecklistItemAccess(itemId, "EDIT");

  await db.boardChecklistItem.update({ where: { id: itemId }, data: { title: title.trim() } });
  revalidatePath("/board");
}

/**
 * CARD ATTACHMENTS
 */

export async function addCardAttachment(cardId: number, name: string, url: string) {
  await assertCardAccess(cardId, "EDIT");

  const attachment = await db.boardCardAttachment.create({ data: { cardId, name, url } });
  revalidatePath("/board");
  return attachment;
}

export async function deleteCardAttachment(attachmentId: number) {
  await assertCardAttachmentAccess(attachmentId, "EDIT");

  await db.boardCardAttachment.delete({ where: { id: attachmentId } });
  revalidatePath("/board");
}

/**
 * CARD ACTIVITY
 */

export async function addCardActivity(cardId: number, message: string) {
  const { card, access } = await assertCardAccess(cardId, "EDIT");
  const user = access.user;

  const activity = await db.boardCardActivity.create({
    data: { cardId, type: "COMMENT", actorName: user.name, message },
  });

  // Tell the people attached to the card that it was commented on.
  const watchers = await db.boardCardMember.findMany({
    where: { cardId, userId: { not: user.id } },
    select: { userId: true },
  });
  const recipientIds = new Set(watchers.map(w => w.userId));
  if (card.assignedToUserId && card.assignedToUserId !== user.id) {
    recipientIds.add(card.assignedToUserId);
  }

  for (const userId of recipientIds) {
    await createNotification(
      userId,
      "BOARD_UPDATED",
      "New Comment",
      `${user.name} commented on "${card.title}"`,
      boardLink(access.boardId)
    ).catch(() => {});
  }

  revalidatePath("/board");
  return activity;
}

/**
 * BOARD BACKGROUND
 */
export async function updateBoardBackground(boardId: number, background: string) {
  await assertBoardAccess(boardId, "EDIT");

  await db.board.update({ where: { id: boardId }, data: { background } });
  revalidatePath("/board");
}

/**
 * CHECKLIST RENAME
 */
export async function renameChecklist(checklistId: number, title: string) {
  await assertChecklistAccess(checklistId, "EDIT");

  await db.boardChecklist.update({ where: { id: checklistId }, data: { title } });
  revalidatePath("/board");
}
