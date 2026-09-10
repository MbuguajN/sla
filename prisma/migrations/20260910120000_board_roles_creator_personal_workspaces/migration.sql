-- Board roles, board creators, and personal workspaces.
--
-- 1. BoardMember.role / WorkspaceMember.role become enums. Board visibility says
--    who can open a board; the member role says who can change it.
-- 2. Board.createdById records who made a board, so a private board always has
--    an owner even when the creator does not own the workspace.
-- 3. Workspace.isPersonal marks a user's own space, the home for personal boards.
--
-- The backfill also repairs boards that were created before the creator was
-- recorded as a member: those had no members at all, which made a PRIVATE board
-- unreachable for everyone except the workspace owner and platform admins.

-- ── 1. Member role enums ────────────────────────────────────────────────────
CREATE TYPE "BoardMemberRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "WorkspaceMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- Existing BoardMember rows carry the free-text 'MEMBER'/'OWNER'. Anything that
-- is not a recognised value becomes an editor, which is what 'MEMBER' meant.
ALTER TABLE "BoardMember" ALTER COLUMN "role" DROP DEFAULT;
UPDATE "BoardMember" SET "role" = 'EDITOR' WHERE "role" IS NULL OR "role" NOT IN ('OWNER', 'EDITOR', 'VIEWER');
ALTER TABLE "BoardMember"
  ALTER COLUMN "role" TYPE "BoardMemberRole" USING "role"::"BoardMemberRole";
ALTER TABLE "BoardMember" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
ALTER TABLE "BoardMember" ALTER COLUMN "role" SET NOT NULL;

ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" DROP DEFAULT;
UPDATE "WorkspaceMember" SET "role" = 'MEMBER' WHERE "role" IS NULL OR "role" NOT IN ('OWNER', 'MEMBER');
ALTER TABLE "WorkspaceMember"
  ALTER COLUMN "role" TYPE "WorkspaceMemberRole" USING "role"::"WorkspaceMemberRole";
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" SET NOT NULL;

-- ── 2. Board creator ────────────────────────────────────────────────────────
ALTER TABLE "Board" ADD COLUMN "createdById" INTEGER;

ALTER TABLE "Board"
  ADD CONSTRAINT "Board_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Board_createdById_idx" ON "Board"("createdById");

-- Best available guess for boards that predate the column: the workspace owner.
--
-- Deliberately skipped for PROJECT boards. Those are created by the system from
-- a project, and their client workspace's owner is whichever active user
-- happened to be first when the workspace was auto-provisioned. Naming that
-- person the board's creator, and so its OWNER, would be inventing authority
-- from an implementation detail. They keep workspace-owner rights either way.
UPDATE "Board" b
SET "createdById" = w."ownerId"
FROM "Workspace" w
WHERE b."workspaceId" = w."id"
  AND b."createdById" IS NULL
  AND b."type" <> 'PROJECT';

-- The creator owns their board. Promote an existing membership if there is one…
UPDATE "BoardMember" m
SET "role" = 'OWNER'
FROM "Board" b
WHERE m."boardId" = b."id"
  AND m."userId" = b."createdById"
  AND m."role" <> 'OWNER';

-- …otherwise add it. This is what un-orphans legacy PRIVATE boards.
INSERT INTO "BoardMember" ("boardId", "userId", "role", "joinedAt")
SELECT b."id", b."createdById", 'OWNER', NOW()
FROM "Board" b
WHERE b."createdById" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "BoardMember" m
    WHERE m."boardId" = b."id" AND m."userId" = b."createdById"
  );

-- ── 3. Personal workspaces ─────────────────────────────────────────────────
ALTER TABLE "Workspace" ADD COLUMN "isPersonal" BOOLEAN NOT NULL DEFAULT false;

-- At most one personal space per user. Partial index, so ordinary workspaces are
-- unaffected (a user may own any number of those).
CREATE UNIQUE INDEX "Workspace_ownerId_personal_key"
  ON "Workspace"("ownerId") WHERE "isPersonal";
