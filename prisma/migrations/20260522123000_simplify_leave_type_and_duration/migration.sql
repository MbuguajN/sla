-- Simplify leave model: keep base leave types and move half-day/full-day to separate duration.
CREATE TYPE "LeaveDuration" AS ENUM ('FULL_DAY', 'HALF_DAY_MORNING', 'HALF_DAY_AFTERNOON');

ALTER TABLE "Leave"
  ADD COLUMN "duration" "LeaveDuration" NOT NULL DEFAULT 'FULL_DAY';

UPDATE "Leave"
SET "duration" = CASE
  WHEN "type"::text IN ('LEAVE_MORNING', 'SICKNESS_LEAVE_MORNING') THEN 'HALF_DAY_MORNING'::"LeaveDuration"
  WHEN "type"::text IN ('LEAVE_AFTERNOON', 'SICKNESS_LEAVE_AFTERNOON') THEN 'HALF_DAY_AFTERNOON'::"LeaveDuration"
  ELSE 'FULL_DAY'::"LeaveDuration"
END;

DO $$
DECLARE
  existing_constraint text;
BEGIN
  SELECT c.conname INTO existing_constraint
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'LeavePolicy'
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) ILIKE '%UNIQUE (role, "leaveType")%';

  IF existing_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "LeavePolicy" DROP CONSTRAINT %I', existing_constraint);
  END IF;
END $$;

CREATE TYPE "LeaveType_new" AS ENUM (
  'ANNUAL_LEAVE',
  'SICKNESS_LEAVE',
  'MATERNITY',
  'PATERNITY',
  'COMPASSIONATE_LEAVE',
  'TOIL',
  'WORK_FROM_HOME'
);

ALTER TABLE "Leave"
  ALTER COLUMN "type" TYPE "LeaveType_new"
  USING (
    CASE
      WHEN "type"::text IN ('LEAVE_FULL_DAY', 'LEAVE_MORNING', 'LEAVE_AFTERNOON') THEN 'ANNUAL_LEAVE'
      WHEN "type"::text IN ('SICKNESS_LEAVE_FULL_DAY', 'SICKNESS_LEAVE_MORNING', 'SICKNESS_LEAVE_AFTERNOON') THEN 'SICKNESS_LEAVE'
      WHEN "type"::text = 'MATERNITY' THEN 'MATERNITY'
      WHEN "type"::text = 'PATERNITY' THEN 'PATERNITY'
      WHEN "type"::text = 'COMPASSIONATE_LEAVE' THEN 'COMPASSIONATE_LEAVE'
      WHEN "type"::text = 'TOIL' THEN 'TOIL'
      WHEN "type"::text = 'WORK_FROM_HOME' THEN 'WORK_FROM_HOME'
      ELSE 'ANNUAL_LEAVE'
    END
  )::"LeaveType_new";

ALTER TABLE "LeavePolicy"
  ALTER COLUMN "leaveType" TYPE "LeaveType_new"
  USING (
    CASE
      WHEN "leaveType"::text IN ('LEAVE_FULL_DAY', 'LEAVE_MORNING', 'LEAVE_AFTERNOON') THEN 'ANNUAL_LEAVE'
      WHEN "leaveType"::text IN ('SICKNESS_LEAVE_FULL_DAY', 'SICKNESS_LEAVE_MORNING', 'SICKNESS_LEAVE_AFTERNOON') THEN 'SICKNESS_LEAVE'
      WHEN "leaveType"::text = 'MATERNITY' THEN 'MATERNITY'
      WHEN "leaveType"::text = 'PATERNITY' THEN 'PATERNITY'
      WHEN "leaveType"::text = 'COMPASSIONATE_LEAVE' THEN 'COMPASSIONATE_LEAVE'
      WHEN "leaveType"::text = 'TOIL' THEN 'TOIL'
      WHEN "leaveType"::text = 'WORK_FROM_HOME' THEN 'WORK_FROM_HOME'
      ELSE 'ANNUAL_LEAVE'
    END
  )::"LeaveType_new";

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY role, "leaveType"
      ORDER BY "daysAllowed" DESC, id ASC
    ) AS rank
  FROM "LeavePolicy"
)
DELETE FROM "LeavePolicy" p
USING ranked r
WHERE p.id = r.id
  AND r.rank > 1;

DROP TYPE "LeaveType";
ALTER TYPE "LeaveType_new" RENAME TO "LeaveType";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'LeavePolicy'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%UNIQUE (role, "leaveType")%'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class
      WHERE relname = 'LeavePolicy_role_leaveType_key'
    ) THEN
      ALTER TABLE "LeavePolicy"
        ADD CONSTRAINT "LeavePolicy_role_leaveType_unique_v2" UNIQUE ("role", "leaveType");
    ELSE
      ALTER TABLE "LeavePolicy"
        ADD CONSTRAINT "LeavePolicy_role_leaveType_key" UNIQUE ("role", "leaveType");
    END IF;
  END IF;
END $$;
