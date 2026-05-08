-- Rework leave categories to modern leave types and support half-day totals.
CREATE TYPE "LeaveType_new" AS ENUM (
  'LEAVE_FULL_DAY',
  'LEAVE_MORNING',
  'LEAVE_AFTERNOON',
  'SICKNESS_LEAVE_FULL_DAY',
  'SICKNESS_LEAVE_MORNING',
  'SICKNESS_LEAVE_AFTERNOON',
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
      WHEN "type"::text = 'ANNUAL' THEN 'LEAVE_FULL_DAY'
      WHEN "type"::text = 'SICK' THEN 'SICKNESS_LEAVE_FULL_DAY'
      WHEN "type"::text = 'MATERNITY' THEN 'MATERNITY'
      WHEN "type"::text = 'PATERNITY' THEN 'PATERNITY'
      WHEN "type"::text = 'COMPASSIONATE' THEN 'COMPASSIONATE_LEAVE'
      WHEN "type"::text = 'UNPAID' THEN 'LEAVE_FULL_DAY'
      WHEN "type"::text = 'OTHER' THEN 'LEAVE_FULL_DAY'
      ELSE 'LEAVE_FULL_DAY'
    END
  )::"LeaveType_new";

ALTER TABLE "LeavePolicy"
  ALTER COLUMN "leaveType" TYPE "LeaveType_new"
  USING (
    CASE
      WHEN "leaveType"::text = 'ANNUAL' THEN 'LEAVE_FULL_DAY'
      WHEN "leaveType"::text = 'SICK' THEN 'SICKNESS_LEAVE_FULL_DAY'
      WHEN "leaveType"::text = 'MATERNITY' THEN 'MATERNITY'
      WHEN "leaveType"::text = 'PATERNITY' THEN 'PATERNITY'
      WHEN "leaveType"::text = 'COMPASSIONATE' THEN 'COMPASSIONATE_LEAVE'
      WHEN "leaveType"::text = 'UNPAID' THEN 'LEAVE_FULL_DAY'
      WHEN "leaveType"::text = 'OTHER' THEN 'LEAVE_FULL_DAY'
      ELSE 'LEAVE_FULL_DAY'
    END
  )::"LeaveType_new";

ALTER TABLE "Leave"
  ALTER COLUMN "totalDays" TYPE DOUBLE PRECISION
  USING "totalDays"::DOUBLE PRECISION;

DROP TYPE "LeaveType";
ALTER TYPE "LeaveType_new" RENAME TO "LeaveType";
