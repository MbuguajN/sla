export const MODERN_LEAVE_TYPES = [
  "ANNUAL_LEAVE",
  "SICKNESS_LEAVE",
  "MATERNITY",
  "PATERNITY",
  "COMPASSIONATE_LEAVE",
  "TOIL",
  "WORK_FROM_HOME",
] as const;

export const LEAVE_DURATIONS = ["FULL_DAY", "HALF_DAY_MORNING", "HALF_DAY_AFTERNOON"] as const;

export type ModernLeaveType = (typeof MODERN_LEAVE_TYPES)[number];
export type LeaveDuration = (typeof LEAVE_DURATIONS)[number];

export const ANNUAL_LEAVE_TYPES: ModernLeaveType[] = ["ANNUAL_LEAVE"];
export const SICKNESS_LEAVE_TYPES: ModernLeaveType[] = ["SICKNESS_LEAVE"];

export function isModernLeaveType(value: string): value is ModernLeaveType {
  return (MODERN_LEAVE_TYPES as readonly string[]).includes(value);
}

export function isLeaveDuration(value: string): value is LeaveDuration {
  return (LEAVE_DURATIONS as readonly string[]).includes(value);
}

export function getLeaveTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    ANNUAL_LEAVE: "Annual Leave",
    SICKNESS_LEAVE: "Sickness Leave",
    MATERNITY: "Maternity",
    PATERNITY: "Paternity",
    COMPASSIONATE_LEAVE: "Compassionate Leave",
    TOIL: "TOIL (Time Off In Lieu)",
    WORK_FROM_HOME: "Work From Home",
  };

  if (labels[value]) return labels[value];

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getLeaveDurationLabel(value: string): string {
  const labels: Record<string, string> = {
    FULL_DAY: "Full Day",
    HALF_DAY_MORNING: "Half Day (Morning)",
    HALF_DAY_AFTERNOON: "Half Day (Afternoon)",
  };

  return labels[value] || value;
}

export function getLeaveFamily(value: string): "ANNUAL" | "SICKNESS" | "OTHER" {
  if (value === "ANNUAL_LEAVE") return "ANNUAL";
  if (value === "SICKNESS_LEAVE") return "SICKNESS";
  return "OTHER";
}

export function getLeaveFamilyLabel(value: "ANNUAL" | "SICKNESS"): string {
  return value === "ANNUAL" ? "Annual Leave" : "Sickness Leave";
}

export function getLeaveTypesForBalance(value: string): string[] {
  return [value];
}

export function getLeaveDayFactor(duration: string): number {
  if (duration === "HALF_DAY_MORNING" || duration === "HALF_DAY_AFTERNOON") {
    return 0.5;
  }

  return 1;
}

export function getLeaveTimeWindow(duration: string): { startHour: number; endHour: number } {
  if (duration === "HALF_DAY_MORNING") {
    return { startHour: 9, endHour: 12 };
  }

  if (duration === "HALF_DAY_AFTERNOON") {
    return { startHour: 12, endHour: 17 };
  }

  return { startHour: 9, endHour: 17 };
}

export function toUtcDateTime(date: Date, hour: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hour,
      0,
      0,
      0
    )
  );
}
