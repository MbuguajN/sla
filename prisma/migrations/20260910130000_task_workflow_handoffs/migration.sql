-- Task workflow: measurable handoffs and owned subtasks.
--
-- 1. Task.assignedAt closes the timing gap between intake and the assignee
--    picking the work up, so time-to-assign can be reported separately from
--    time-to-deliver.
-- 2. Subtask.deptId / assignedUserId give routed cross-department work a real
--    owner. Until now routed work was a Subtask whose title was prefixed with
--    "[Department]", which nobody but the parent task's assignee could complete.
-- 3. New activity and notification kinds for the handoffs that were silent.

-- ── 1. Assignment timestamp ────────────────────────────────────────────────
ALTER TABLE "Task" ADD COLUMN "assignedAt" TIMESTAMP(3);

-- Best-effort backfill: a task that has an assignee was assigned at some point,
-- and confirmation is the closest recorded moment we have.
UPDATE "Task"
SET "assignedAt" = COALESCE("confirmedAt", "slaStartedAt", "createdAt")
WHERE "assignedUserId" IS NOT NULL AND "assignedAt" IS NULL;

-- ── 2. Subtask ownership ───────────────────────────────────────────────────
ALTER TABLE "Subtask" ADD COLUMN "deptId" INTEGER;
ALTER TABLE "Subtask" ADD COLUMN "assignedUserId" INTEGER;

ALTER TABLE "Subtask"
  ADD CONSTRAINT "Subtask_deptId_fkey"
  FOREIGN KEY ("deptId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Subtask"
  ADD CONSTRAINT "Subtask_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Subtask_taskId_idx" ON "Subtask"("taskId");
CREATE INDEX "Subtask_deptId_status_idx" ON "Subtask"("deptId", "status");
CREATE INDEX "Subtask_assignedUserId_idx" ON "Subtask"("assignedUserId");

-- Recover the department from the "[Department] title" prefix that routed
-- subtasks were created with, then strip the prefix now that it is real data.
UPDATE "Subtask" s
SET "deptId" = d."id"
FROM "Department" d
WHERE s."deptId" IS NULL
  AND s."title" LIKE '[' || d."name" || '] %';

UPDATE "Subtask" s
SET "title" = substring(s."title" from position(']' in s."title") + 2)
FROM "Department" d
WHERE s."deptId" = d."id"
  AND s."title" LIKE '[' || d."name" || '] %';

-- ── 3. Vocabulary for the previously silent handoffs ───────────────────────
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'REASSIGNED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'DECLINED';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_REASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_STARTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_PAUSED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_REVISION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_CANCELLED';
