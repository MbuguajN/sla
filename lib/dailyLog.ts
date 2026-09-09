/**
 * Daily Log ranges and source labelling.
 *
 * Shared by the server page (which does the filtering) and the client table
 * (which renders the controls), so the two cannot disagree about what
 * "this week" means or how a row should be badged.
 */

export type LogRange = "all" | "daily" | "weekly" | "monthly";

export const LOG_RANGES: { key: LogRange; label: string }[] = [
  { key: "all", label: "All" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

export const DEFAULT_LOG_RANGE: LogRange = "all";

export function parseLogRange(value: string | undefined): LogRange {
  return LOG_RANGES.some((r) => r.key === value) ? (value as LogRange) : DEFAULT_LOG_RANGE;
}

/**
 * Start/end bounds for a range, or null for "all" (no date filter).
 * Weeks start on Monday, months are calendar months.
 */
export function resolveLogRange(range: LogRange, now = new Date()): { start: Date; end: Date } | null {
  if (range === "all") return null;

  if (range === "daily") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { start, end };
  }

  if (range === "weekly") {
    const day = now.getDay();
    const offset = day === 0 ? -6 : 1 - day; // Monday-start
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export type LogSource = "log" | "task" | "board" | "subtask";

/**
 * Maps the `source` recorded in ActivityLog metadata onto a display source.
 * Board cards and board checklist items are the two board feeds; a checklist
 * item is the board equivalent of a subtask, so both land on "subtask".
 */
export function logSourceFromMetadata(source: string | undefined | null): LogSource {
  switch (source) {
    case "BOARD_CARD":
      return "board";
    case "BOARD_CHECKLIST":
    case "SUBTASK_COMPLETION":
      return "subtask";
    default:
      return "log";
  }
}

export const LOG_SOURCE_LABELS: Record<LogSource, string> = {
  log: "Log",
  task: "Task",
  board: "Board",
  subtask: "Subtask",
};
