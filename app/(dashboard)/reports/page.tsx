import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { canViewReports, getCurrentUser } from "@/lib/permissions";
import ReportsClient, {
  type ClientHealthSlice,
  type DepartmentPerformanceRow,
  type EmployeeReportCard,
  type ReportMeta,
  type ReportSummary,
  type TrendPoint,
} from "./ReportsClient";
import {
  ANNUAL_LEAVE_TYPES,
  SICKNESS_LEAVE_TYPES,
  getLeaveFamily,
  getLeaveFamilyLabel,
} from "@/lib/leave";

export const dynamic = "force-dynamic";

type SearchParams = {
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  reportTab?: string;
};

type TrackedTask = {
  id: number;
  title: string;
  completedAt: Date | null;
  slaStartedAt: Date | null;
  slaHours: number | null;
  slaPausedDuration: number | null;
  assignedDepartment: { name: string } | null;
  project: { client: { id: number; name: string } };
};

type EvaluatedTask = {
  id: number;
  title: string;
  met: boolean;
  completionHours: number;
  deptName: string;
  clientId: number;
  clientName: string;
  completedAt: Date;
};

type EmployeeCompletedTask = {
  id: number;
  title: string;
  createdById: number;
  assignedUserId: number | null;
  completedAt: Date | null;
  updatedAt: Date;
  slaStartedAt: Date | null;
  slaHours: number | null;
  slaPausedDuration: number | null;
};

type EmployeeWithDepartment = Prisma.UserGetPayload<{
  include: {
    department: { select: { name: true; slug: true } };
  };
}>;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function safeDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatRangeLabel(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (formatDateInput(start) === formatDateInput(end)) return startLabel;
  return `${startLabel} - ${endLabel}`;
}

function resolveDateRange(params: SearchParams) {
  const now = new Date();
  const active = params.dateRange || "today";
  let start = startOfDay(now);
  let end = endOfDay(now);

  if (active === "7d") {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
  } else if (active === "30d") {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
  } else if (active === "quarter") {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    end = endOfDay(now);
  } else if (active === "custom") {
    const customStart = safeDate(params.startDate);
    const customEnd = safeDate(params.endDate);
    if (customStart && customEnd) {
      start = startOfDay(customStart);
      end = endOfDay(customEnd);
    }
  }

  if (end.getTime() < start.getTime()) {
    end = endOfDay(start);
  }

  const diffMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - diffMs);

  return {
    activeRange: active as ReportMeta["activeRange"],
    start,
    end,
    previousStart,
    previousEnd,
    startInput: formatDateInput(start),
    endInput: formatDateInput(end),
    rangeLabel: formatRangeLabel(start, end),
  };
}

function evaluateTask(task: TrackedTask): EvaluatedTask | null {
  if (!task.completedAt || !task.slaStartedAt || !task.slaHours) return null;

  const rawElapsedMs = task.completedAt.getTime() - task.slaStartedAt.getTime();
  const pausedMs = (task.slaPausedDuration || 0) * 1000;
  const elapsedMs = Math.max(0, rawElapsedMs - pausedMs);
  const allowedMs = task.slaHours * 60 * 60 * 1000;

  return {
    id: task.id,
    title: task.title,
    met: elapsedMs <= allowedMs,
    completionHours: elapsedMs / (60 * 60 * 1000),
    deptName: task.assignedDepartment?.name || "General",
    clientId: task.project.client.id,
    clientName: task.project.client.name,
    completedAt: task.completedAt,
  };
}

function computeDelta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return round2(((current - previous) / previous) * 100);
}

function buildTrendPoints(tasks: EvaluatedTask[], start: Date, end: Date, activeRange: ReportMeta["activeRange"]): TrendPoint[] {
  const points: TrendPoint[] = [];

  if (activeRange === "today") {
    for (let hour = 0; hour < 24; hour += 4) {
      const bucketStart = new Date(start);
      bucketStart.setHours(hour, 0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setHours(hour + 4, 0, 0, 0);
      const bucket = tasks.filter((task) => task.completedAt >= bucketStart && task.completedAt < bucketEnd);
      const met = bucket.filter((task) => task.met).length;
      const rate = bucket.length ? round2((met / bucket.length) * 100) : 0;
      points.push({
        label: bucketStart.toLocaleTimeString("en-US", { hour: "numeric" }),
        value: rate,
        startDate: formatDateInput(bucketStart),
        endDate: formatDateInput(new Date(bucketEnd.getTime() - 1)),
        href: "",
      });
    }
    return points;
  }

  if (activeRange === "quarter") {
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const bucketStart = new Date(start.getFullYear(), start.getMonth() + monthOffset, 1);
      const bucketEnd = new Date(start.getFullYear(), start.getMonth() + monthOffset + 1, 1);
      const bucket = tasks.filter((task) => task.completedAt >= bucketStart && task.completedAt < bucketEnd);
      const met = bucket.filter((task) => task.met).length;
      const rate = bucket.length ? round2((met / bucket.length) * 100) : 0;
      points.push({
        label: bucketStart.toLocaleDateString("en-US", { month: "short" }),
        value: rate,
        startDate: formatDateInput(bucketStart),
        endDate: formatDateInput(new Date(bucketEnd.getTime() - 1)),
        href: "",
      });
    }
    return points;
  }

  const dayStep = activeRange === "7d" ? 1 : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 6)));
  let cursor = new Date(start);

  while (cursor <= end) {
    const bucketStart = new Date(cursor);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketEnd.getDate() + dayStep);

    const bucket = tasks.filter((task) => task.completedAt >= bucketStart && task.completedAt < bucketEnd);
    const met = bucket.filter((task) => task.met).length;
    const rate = bucket.length ? round2((met / bucket.length) * 100) : 0;

    points.push({
      label: bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: rate,
      startDate: formatDateInput(bucketStart),
      endDate: formatDateInput(new Date(bucketEnd.getTime() - 1)),
      href: "",
    });

    cursor = bucketEnd;
  }

  return points;
}

function buildTaskQuery(startDate: string, endDate: string, extra: Record<string, string>) {
  const params = new URLSearchParams({ startDate, endDate, ...extra });
  return `/tasks?${params.toString()}`;
}

function buildClientQuery(startDate: string, endDate: string, healthBucket: string) {
  const params = new URLSearchParams({ startDate, endDate, healthBucket });
  return `/clients?${params.toString()}`;
}

const DEPT_SUBTITLES: Record<string, string> = {
  Creative: "Art & Brand Studio",
  Content: "Editorial & Strategy",
  Technology: "Cloud Infrastructure",
  Media: "Broadcast & Production",
  "Business Development": "Growth & Partnerships",
  Finance: "Financial Operations",
  "Client Service": "Global Enterprise",
  "General Staff": "Operational Support",
  "Human Resources": "People & Culture",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewReports(user)) redirect("/dashboard");

  const range = resolveDateRange(params);
  const initialReportTab = params.reportTab === "employee" ? "employee" : "company";

  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const [tasks, previousTasks, departments, clients] = await Promise.all([
    db.task.findMany({
      where: {
        status: "DONE",
        completedAt: { not: null, gte: range.start, lte: range.end },
        slaStartedAt: { not: null },
        slaHours: { not: null },
      },
      include: {
        assignedDepartment: { select: { name: true } },
        project: { select: { client: { select: { id: true, name: true } } } },
      },
      orderBy: { completedAt: "asc" },
    }),
    db.task.findMany({
      where: {
        status: "DONE",
        completedAt: { not: null, gte: range.previousStart, lte: range.previousEnd },
        slaStartedAt: { not: null },
        slaHours: { not: null },
      },
      include: {
        assignedDepartment: { select: { name: true } },
        project: { select: { client: { select: { id: true, name: true } } } },
      },
      orderBy: { completedAt: "asc" },
    }),
    db.department.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    db.client.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  let employees: EmployeeWithDepartment[] = [];
  let employeeCompletedTasks: EmployeeCompletedTask[] = [];
  let leavePolicies: { role: "MANAGER" | "EMPLOYEE"; leaveType: string; daysAllowed: number }[] = [];
  let employeeLeaves: { userId: number; type: string; totalDays: number }[] = [];
  let equipmentOwnership: { ownerUserId: number; _count: { _all: number } }[] = [];
  let dailyLogActivities: {
    id: number;
    userId: number;
    createdAt: Date;
    metadata: string | null;
    task: { title: string } | null;
    project: { title: string } | null;
  }[] = [];

  if (initialReportTab === "employee") {
    employees = await db.user.findMany({
      where: {
        isActive: true,
        role: { in: ["MANAGER", "EMPLOYEE"] },
        department: {
          slug: { notIn: ["finance", "human-resources"] },
        },
      },
      include: {
        department: { select: { name: true, slug: true } },
      },
      orderBy: { name: "asc" },
    });

    const employeeIds = employees.map((employee) => employee.id);

    const [rawEmployeeTasks, rawLeavePolicies, rawEmployeeLeaves, rawDailyLogActivities, rawEquipmentOwnership] = await Promise.all([
      db.task.findMany({
        where: {
          status: "DONE",
          completedAt: { not: null, gte: yearStart },
        },
        select: {
          id: true,
          title: true,
          createdById: true,
          assignedUserId: true,
          completedAt: true,
          updatedAt: true,
          slaStartedAt: true,
          slaHours: true,
          slaPausedDuration: true,
        },
        orderBy: { completedAt: "desc" },
      }),
      db.leavePolicy.findMany({
        where: {
          role: { in: ["MANAGER", "EMPLOYEE"] },
        },
        select: {
          role: true,
          leaveType: true,
          daysAllowed: true,
        },
      }),
      db.leave.findMany({
        where: {
          userId: { in: employeeIds },
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { gte: yearStart, lte: yearEnd },
        },
        select: {
          userId: true,
          type: true,
          totalDays: true,
        },
      }),
      db.activityLog.findMany({
        where: {
          userId: { in: employeeIds },
          type: "COMMENTED",
          metadata: { contains: '"kind":"DAILY_LOG"' },
          createdAt: { gte: range.start, lte: range.end },
        },
        select: {
          id: true,
          userId: true,
          createdAt: true,
          metadata: true,
          task: { select: { title: true } },
          project: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.equipmentItem.groupBy({
        by: ["ownerUserId"],
        where: {
          ownerUserId: { in: employeeIds },
        },
        _count: { _all: true },
      }),
    ]);

    employeeCompletedTasks = rawEmployeeTasks as EmployeeCompletedTask[];
    leavePolicies = rawLeavePolicies as { role: "MANAGER" | "EMPLOYEE"; leaveType: string; daysAllowed: number }[];
    employeeLeaves = rawEmployeeLeaves as { userId: number; type: string; totalDays: number }[];
    dailyLogActivities = rawDailyLogActivities;
    equipmentOwnership = rawEquipmentOwnership as { ownerUserId: number; _count: { _all: number } }[];
  }

  const evaluated = tasks
    .map((task) => evaluateTask(task as TrackedTask))
    .filter((item): item is EvaluatedTask => Boolean(item));

  const previousEvaluated = previousTasks
    .map((task) => evaluateTask(task as TrackedTask))
    .filter((item): item is EvaluatedTask => Boolean(item));

  const metCount = evaluated.filter((item) => item.met).length;
  const missedCount = evaluated.length - metCount;
  const complianceRate = evaluated.length ? round2((metCount / evaluated.length) * 100) : 0;
  const avgCompletionHours = evaluated.length
    ? round2(evaluated.reduce((sum, item) => sum + item.completionHours, 0) / evaluated.length)
    : 0;

  const previousMet = previousEvaluated.filter((item) => item.met).length;
  const previousMissed = previousEvaluated.length - previousMet;
  const previousCompliance = previousEvaluated.length ? round2((previousMet / previousEvaluated.length) * 100) : 0;
  const previousAvgCompletion = previousEvaluated.length
    ? round2(previousEvaluated.reduce((sum, item) => sum + item.completionHours, 0) / previousEvaluated.length)
    : 0;

  const summary: ReportSummary = {
    trackedTasks: evaluated.length,
    metCount,
    missedCount,
    complianceRate,
    avgCompletionHours,
    companyHealthBand: complianceRate >= 85 ? "Healthy" : complianceRate >= 70 ? "Watch" : "Critical",
    complianceDelta: computeDelta(complianceRate, previousCompliance),
    metDelta: computeDelta(metCount, previousMet),
    missedDelta: computeDelta(missedCount, previousMissed),
    avgCompletionDelta: computeDelta(previousAvgCompletion, avgCompletionHours),
  };

  const deptMap = new Map<string, { completed: number; met: number; totalHours: number }>();
  for (const department of departments) {
    deptMap.set(department.name, { completed: 0, met: 0, totalHours: 0 });
  }

  for (const task of evaluated) {
    const current = deptMap.get(task.deptName) || { completed: 0, met: 0, totalHours: 0 };
    current.completed += 1;
    if (task.met) current.met += 1;
    current.totalHours += task.completionHours;
    deptMap.set(task.deptName, current);
  }

  const departmentPerformance: DepartmentPerformanceRow[] = Array.from(deptMap.entries())
    .map(([department, stats]) => {
      const missed = stats.completed - stats.met;
      const onTimeRate = stats.completed ? round2((stats.met / stats.completed) * 100) : 0;
      const avgHours = stats.completed ? round2(stats.totalHours / stats.completed) : 0;
      return {
        department,
        subtitle: DEPT_SUBTITLES[department] || "",
        completed: stats.completed,
        met: stats.met,
        missed,
        onTimeRate,
        avgCompletionHours: avgHours,
        href: buildTaskQuery(range.startInput, range.endInput, {
          department,
          reportView: "1",
        }),
      };
    })
    .sort((a, b) => b.onTimeRate - a.onTimeRate || b.completed - a.completed);

  const clientMap = new Map<number, { name: string; total: number; met: number }>();
  for (const client of clients) {
    clientMap.set(client.id, { name: client.name, total: 0, met: 0 });
  }

  for (const task of evaluated) {
    const current = clientMap.get(task.clientId) || { name: task.clientName, total: 0, met: 0 };
    current.total += 1;
    if (task.met) current.met += 1;
    clientMap.set(task.clientId, current);
  }

  let healthyClients = 0;
  let monitoringClients = 0;
  let criticalClients = 0;

  for (const client of Array.from(clientMap.values())) {
    if (!client.total) continue;
    const rate = (client.met / client.total) * 100;
    if (rate >= 85) healthyClients += 1;
    else if (rate >= 60) monitoringClients += 1;
    else criticalClients += 1;
  }

  const clientHealth: ClientHealthSlice[] = [
    {
      label: "Active & Healthy",
      value: healthyClients,
      color: "#c91f41",
      href: buildClientQuery(range.startInput, range.endInput, "healthy"),
    },
    {
      label: "Monitoring Required",
      value: monitoringClients,
      color: "#116b5f",
      href: buildClientQuery(range.startInput, range.endInput, "monitoring"),
    },
    {
      label: "Critical Status",
      value: criticalClients,
      color: "#ef4444",
      href: buildClientQuery(range.startInput, range.endInput, "critical"),
    },
  ];

  const trend = buildTrendPoints(evaluated, range.start, range.end, range.activeRange).map((point) => ({
    ...point,
    href: buildTaskQuery(point.startDate, point.endDate, { reportView: "1" }),
  }));

  const meta: ReportMeta = {
    activeRange: range.activeRange,
    startDate: range.startInput,
    endDate: range.endInput,
    rangeLabel: range.rangeLabel,
  };

  const leaveUsageMap = new Map<number, Map<string, number>>();
  for (const leave of employeeLeaves) {
    const perType = leaveUsageMap.get(leave.userId) || new Map<string, number>();
    perType.set(leave.type, (perType.get(leave.type) || 0) + leave.totalDays);
    leaveUsageMap.set(leave.userId, perType);
  }

  const dailyLogsByUser = new Map<
    number,
    { id: number; note: string; markCompleted: boolean; taskTitle: string; projectTitle: string; createdAt: string }[]
  >();

  for (const log of dailyLogActivities) {
    if (!log.metadata) continue;

    try {
      const parsed = JSON.parse(log.metadata) as {
        kind?: string;
        note?: string;
        markCompleted?: boolean;
        taskTitle?: string;
        projectTitle?: string;
      };

      if (parsed.kind !== "DAILY_LOG") continue;

      const list = dailyLogsByUser.get(log.userId) || [];
      list.push({
        id: log.id,
        note: parsed.note || "",
        markCompleted: Boolean(parsed.markCompleted),
        taskTitle: parsed.taskTitle || log.task?.title || "Unknown Task",
        projectTitle: parsed.projectTitle || log.project?.title || "Unknown Project",
        createdAt: log.createdAt.toISOString(),
      });
      dailyLogsByUser.set(log.userId, list);
    } catch {
      continue;
    }
  }

  const equipmentOwnershipByUser = new Map<number, number>();
  for (const row of equipmentOwnership) {
    if (typeof row.ownerUserId === "number") {
      equipmentOwnershipByUser.set(row.ownerUserId, row._count._all);
    }
  }

  const CS_BD_SLUGS = new Set(["client-service", "business-development"]);
  const csBdEmployeeIds = new Set(
    employees
      .filter((e) => e.department && CS_BD_SLUGS.has(e.department.slug))
      .map((e) => e.id)
  );

  const tasksByCreator = new Map<number, EmployeeCompletedTask[]>();
  const tasksByAssignee = new Map<number, EmployeeCompletedTask[]>();

  for (const task of employeeCompletedTasks) {
    const taskData: EmployeeCompletedTask = {
      id: task.id,
      title: task.title,
      createdById: task.createdById,
      assignedUserId: task.assignedUserId,
      completedAt: task.completedAt,
      updatedAt: task.updatedAt,
      slaStartedAt: task.slaStartedAt,
      slaHours: task.slaHours,
      slaPausedDuration: task.slaPausedDuration,
    };

    if (task.createdById && csBdEmployeeIds.has(task.createdById)) {
      const list = tasksByCreator.get(task.createdById) || [];
      list.push(taskData);
      tasksByCreator.set(task.createdById, list);
    }

    if (task.assignedUserId && !csBdEmployeeIds.has(task.assignedUserId)) {
      const list = tasksByAssignee.get(task.assignedUserId) || [];
      list.push(taskData);
      tasksByAssignee.set(task.assignedUserId, list);
    }
  }

  const employeeReports: EmployeeReportCard[] = employees.map((employee) => {
    const perType = leaveUsageMap.get(employee.id) || new Map<string, number>();
    const roleLeaveEntries = leavePolicies.filter((p) => p.role === employee.role);

    const annualPolicy =
      roleLeaveEntries.find((policy) => ANNUAL_LEAVE_TYPES.includes(policy.leaveType as any)) ?? null;
    const sicknessPolicy =
      roleLeaveEntries.find((policy) => SICKNESS_LEAVE_TYPES.includes(policy.leaveType as any)) ?? null;

    const annualUsed = Array.from(perType.entries())
      .filter(([type]) => getLeaveFamily(type) === "ANNUAL")
      .reduce((sum, [, value]) => sum + value, 0);

    const sicknessUsed = Array.from(perType.entries())
      .filter(([type]) => getLeaveFamily(type) === "SICKNESS")
      .reduce((sum, [, value]) => sum + value, 0);

    const leaveBalances = [
      annualPolicy
        ? {
            type: getLeaveFamilyLabel("ANNUAL"),
            daysAllowed: annualPolicy.daysAllowed,
            usedDays: annualUsed,
            remainingDays: Math.max(annualPolicy.daysAllowed - annualUsed, 0),
          }
        : null,
      sicknessPolicy
        ? {
            type: getLeaveFamilyLabel("SICKNESS"),
            daysAllowed: sicknessPolicy.daysAllowed,
            usedDays: sicknessUsed,
            remainingDays: Math.max(sicknessPolicy.daysAllowed - sicknessUsed, 0),
          }
        : null,
    ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    const isCsBd = employee.department && CS_BD_SLUGS.has(employee.department.slug);
    const rawTasks = isCsBd
      ? (tasksByCreator.get(employee.id) || [])
      : (tasksByAssignee.get(employee.id) || []);

    return {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      departmentName: employee.department?.name || "No Department",
      leaveBalances,
      companyItemsOwned: equipmentOwnershipByUser.get(employee.id) || 0,
      dailyLogs: dailyLogsByUser.get(employee.id) || [],
      tasks: rawTasks.map((task) => ({
        id: task.id,
        title: task.title,
        completedAt: (task.completedAt ?? task.updatedAt).toISOString(),
        slaStartedAt: (task.slaStartedAt ?? new Date(0)).toISOString(),
        slaHours: task.slaHours ?? 0,
        slaPausedDuration: task.slaPausedDuration ?? 0,
      })),
    };
  });

  return (
    <ReportsClient
      meta={meta}
      summary={summary}
      clientHealth={clientHealth}
      trend={trend}
      departments={departmentPerformance}
      employeeReports={employeeReports}
      initialReportTab={initialReportTab}
    />
  );
}
