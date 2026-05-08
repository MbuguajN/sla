export const MODERN_LEAVE_TYPES = [
  "LEAVE_FULL_DAY",
  "LEAVE_MORNING",
  "LEAVE_AFTERNOON",
  "SICKNESS_LEAVE_FULL_DAY",
  "SICKNESS_LEAVE_MORNING",
  "SICKNESS_LEAVE_AFTERNOON",
  "MATERNITY",
  "PATERNITY",
  "COMPASSIONATE_LEAVE",
  "TOIL",
  "WORK_FROM_HOME",
] as const;

export type ModernLeaveType = (typeof MODERN_LEAVE_TYPES)[number];

export const ANNUAL_LEAVE_TYPES: ModernLeaveType[] = [
  "LEAVE_FULL_DAY",
  "LEAVE_MORNING",
  "LEAVE_AFTERNOON",
];

export const SICKNESS_LEAVE_TYPES: ModernLeaveType[] = [
  "SICKNESS_LEAVE_FULL_DAY",
  "SICKNESS_LEAVE_MORNING",
  "SICKNESS_LEAVE_AFTERNOON",
];

export function isModernLeaveType(value: string): value is ModernLeaveType {
  return (MODERN_LEAVE_TYPES as readonly string[]).includes(value);
}

export function getLeaveTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    LEAVE_FULL_DAY: "Leave (Full Day)",
    LEAVE_MORNING: "Leave (Morning)",
    LEAVE_AFTERNOON: "Leave (Afternoon)",
    SICKNESS_LEAVE_FULL_DAY: "Sickness Leave (Full Day)",
    SICKNESS_LEAVE_MORNING: "Sickness Leave (Morning)",
    SICKNESS_LEAVE_AFTERNOON: "Sickness Leave (Afternoon)",
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

export function getLeaveFamily(value: string): "ANNUAL" | "SICKNESS" | "OTHER" {
  if (ANNUAL_LEAVE_TYPES.includes(value as ModernLeaveType)) return "ANNUAL";
  if (SICKNESS_LEAVE_TYPES.includes(value as ModernLeaveType)) return "SICKNESS";
  return "OTHER";
}

export function getLeaveFamilyLabel(value: "ANNUAL" | "SICKNESS"): string {
  return value === "ANNUAL" ? "Annual Leave" : "Sickness Leave";
}

export function getLeaveTypesForBalance(value: string): string[] {
  const family = getLeaveFamily(value);
  if (family === "ANNUAL") return [...ANNUAL_LEAVE_TYPES];
  if (family === "SICKNESS") return [...SICKNESS_LEAVE_TYPES];
  return [value];
}

export function getLeaveDayFactor(leaveType: string): number {
  if (leaveType.endsWith("_MORNING") || leaveType.endsWith("_AFTERNOON")) {
    return 0.5;
  }

  return 1;
}

export function getLeaveTimeWindow(leaveType: string): { startHour: number; endHour: number } {
  if (leaveType.endsWith("_MORNING")) {
    return { startHour: 9, endHour: 12 };
  }

  if (leaveType.endsWith("_AFTERNOON")) {
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
