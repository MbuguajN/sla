import { db } from "./db";
import { getCurrentUser, type UserWithDepartment } from "./permissions";
import type { BoardMemberRole, BoardVisibility, WorkspaceMemberRole } from "@prisma/client";

/**
 * Board authorization.
 *
 * Every board / list / card / checklist mutation routes through here so the
 * rules live in one place instead of being re-derived per action.
 *
 * Levels:
 *   VIEW  - can open the board and read its cards
 *   EDIT  - can add / change / move lists and cards
 *   ADMIN - can change visibility, delete the board, manage its members
 *
 * How a level is earned:
 *   workspace owner               -> ADMIN
 *   BoardMember role OWNER        -> ADMIN
 *   platform ADMIN / CEO          -> ADMIN, except inside a personal workspace
 *   BoardMember role EDITOR       -> EDIT
 *   BoardMember role VIEWER       -> VIEW    (an explicit role always wins)
 *   WORKSPACE board + ws member   -> EDIT
 *   PUBLIC board + ws member      -> EDIT
 *   PUBLIC board + any active user-> VIEW    (org-wide read access)
 *   PRIVATE board + no membership -> no access
 *
 * A personal workspace is the one place platform admins get no implicit access:
 * "personal" would mean nothing if every admin could read it. They still see
 * anything they were explicitly added to.
 */

export type BoardAccessLevel = "VIEW" | "EDIT" | "ADMIN";

const LEVEL_RANK: Record<BoardAccessLevel, number> = { VIEW: 1, EDIT: 2, ADMIN: 3 };

export type BoardAccess = {
  user: UserWithDepartment;
  boardId: number;
  title: string;
  visibility: BoardVisibility;
  workspaceId: number;
  workspaceName: string;
  isPersonalWorkspace: boolean;
  isWorkspaceOwner: boolean;
  isWorkspaceMember: boolean;
  isBoardMember: boolean;
  boardMemberRole: BoardMemberRole | null;
  level: BoardAccessLevel | null;
};

function levelFor(params: {
  user: UserWithDepartment;
  visibility: BoardVisibility;
  isPersonalWorkspace: boolean;
  isWorkspaceOwner: boolean;
  isWorkspaceMember: boolean;
  boardMemberRole: BoardMemberRole | null;
}): BoardAccessLevel | null {
  const { user, visibility, isPersonalWorkspace, isWorkspaceOwner, isWorkspaceMember, boardMemberRole } = params;

  if (isWorkspaceOwner) return "ADMIN";
  if (boardMemberRole === "OWNER") return "ADMIN";

  // Everywhere but a personal space, platform admins hold the keys.
  if (!isPersonalWorkspace && (user.role === "ADMIN" || user.role === "CEO")) return "ADMIN";

  // An explicit membership row beats whatever the visibility would have granted,
  // so a VIEWER stays a viewer on a WORKSPACE board.
  if (boardMemberRole === "EDITOR") return "EDIT";
  if (boardMemberRole === "VIEWER") return "VIEW";

  if (visibility === "WORKSPACE" && isWorkspaceMember) return "EDIT";
  if (visibility === "PUBLIC") return isWorkspaceMember ? "EDIT" : "VIEW";
  return null;
}

/**
 * Resolve the caller's access to a board. Throws when there is no session,
 * returns null when the board does not exist.
 */
export async function getBoardAccess(boardId: number): Promise<BoardAccess | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const board = await db.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      title: true,
      visibility: true,
      workspaceId: true,
      workspace: {
        select: {
          name: true,
          ownerId: true,
          isPersonal: true,
          members: { where: { userId: user.id }, select: { role: true } },
        },
      },
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });

  if (!board) return null;

  const isWorkspaceOwner = board.workspace.ownerId === user.id;
  const isWorkspaceMember = board.workspace.members.length > 0;
  const boardMemberRole = board.members[0]?.role ?? null;
  const isPersonalWorkspace = board.workspace.isPersonal;

  return {
    user,
    boardId: board.id,
    title: board.title,
    visibility: board.visibility,
    workspaceId: board.workspaceId,
    workspaceName: board.workspace.name,
    isPersonalWorkspace,
    isWorkspaceOwner,
    isWorkspaceMember,
    isBoardMember: boardMemberRole !== null,
    boardMemberRole,
    level: levelFor({
      user,
      visibility: board.visibility,
      isPersonalWorkspace,
      isWorkspaceOwner,
      isWorkspaceMember,
      boardMemberRole,
    }),
  };
}

export function hasLevel(access: BoardAccess, required: BoardAccessLevel) {
  return access.level !== null && LEVEL_RANK[access.level] >= LEVEL_RANK[required];
}

function denied(required: BoardAccessLevel): never {
  if (required === "VIEW") throw new Error("You do not have access to this board");
  if (required === "EDIT") throw new Error("You do not have permission to change this board");
  throw new Error("Only the board owner or workspace owner can do this");
}

/**
 * Assert the caller holds at least `required` on a board.
 */
export async function assertBoardAccess(
  boardId: number,
  required: BoardAccessLevel = "EDIT"
): Promise<BoardAccess> {
  const access = await getBoardAccess(boardId);
  if (!access) throw new Error("Board not found");
  if (!hasLevel(access, required)) denied(required);
  return access;
}

/**
 * The same assertion, addressed by a child record. Each resolver looks up the
 * owning board id and then defers to assertBoardAccess.
 */
export async function assertListAccess(listId: number, required: BoardAccessLevel = "EDIT") {
  const list = await db.boardList.findUnique({
    where: { id: listId },
    select: { id: true, boardId: true, title: true, isRestricted: true, createdById: true },
  });
  if (!list) throw new Error("List not found");
  return { list, access: await assertBoardAccess(list.boardId, required) };
}

export async function assertCardAccess(cardId: number, required: BoardAccessLevel = "EDIT") {
  const card = await db.boardCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      title: true,
      taskId: true,
      listId: true,
      assignedToUserId: true,
      isCompleted: true,
      includeInLogs: true,
      list: { select: { boardId: true, isRestricted: true } },
    },
  });
  if (!card) throw new Error("Card not found");
  return { card, access: await assertBoardAccess(card.list.boardId, required) };
}

export async function assertChecklistAccess(checklistId: number, required: BoardAccessLevel = "EDIT") {
  const checklist = await db.boardChecklist.findUnique({
    where: { id: checklistId },
    select: {
      id: true,
      title: true,
      cardId: true,
      card: { select: { title: true, taskId: true, list: { select: { boardId: true, isRestricted: true } } } },
    },
  });
  if (!checklist) throw new Error("Checklist not found");
  return { checklist, access: await assertBoardAccess(checklist.card.list.boardId, required) };
}

export async function assertChecklistItemAccess(itemId: number, required: BoardAccessLevel = "EDIT") {
  const item = await db.boardChecklistItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      title: true,
      isDone: true,
      subtaskId: true,
      assignedUserId: true,
      checklist: {
        select: { id: true, card: { select: { id: true, list: { select: { boardId: true, isRestricted: true } } } } },
      },
    },
  });
  if (!item) throw new Error("Checklist item not found");
  return { item, access: await assertBoardAccess(item.checklist.card.list.boardId, required) };
}

export async function assertCardLabelAccess(labelId: number, required: BoardAccessLevel = "EDIT") {
  const label = await db.boardCardLabel.findUnique({
    where: { id: labelId },
    select: { id: true, cardId: true, card: { select: { list: { select: { boardId: true } } } } },
  });
  if (!label) throw new Error("Label not found");
  return { label, access: await assertBoardAccess(label.card.list.boardId, required) };
}

export async function assertCardAttachmentAccess(attachmentId: number, required: BoardAccessLevel = "EDIT") {
  const attachment = await db.boardCardAttachment.findUnique({
    where: { id: attachmentId },
    select: { id: true, cardId: true, card: { select: { list: { select: { boardId: true } } } } },
  });
  if (!attachment) throw new Error("Attachment not found");
  return { attachment, access: await assertBoardAccess(attachment.card.list.boardId, required) };
}

/**
 * Workspace-level authorization, used by workspace member management.
 */
export type WorkspaceAccessLevel = "MEMBER" | "ADMIN";

export async function assertWorkspaceAccess(
  workspaceId: number,
  required: WorkspaceAccessLevel = "MEMBER"
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      isPersonal: true,
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");

  const isOwner = workspace.ownerId === user.id;

  // Nobody but the owner administers a personal space.
  if (workspace.isPersonal && !isOwner) {
    throw new Error("This is someone's personal space");
  }

  const isPlatformAdmin = user.role === "ADMIN" || user.role === "CEO";
  const memberRole: WorkspaceMemberRole | null = workspace.members[0]?.role ?? null;
  const isAdmin = isOwner || isPlatformAdmin || memberRole === "OWNER";

  if (required === "ADMIN" && !isAdmin) {
    throw new Error("Only the workspace owner can do this");
  }
  if (required === "MEMBER" && !isAdmin && memberRole === null) {
    throw new Error("You are not a member of this workspace");
  }

  return { user, workspace, isOwner, isAdmin, memberRole };
}
