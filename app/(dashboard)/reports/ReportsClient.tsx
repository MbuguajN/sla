"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, X, ExternalLink } from "lucide-react";
import {
  CheckmarkCircle01Icon,
  TaskDone01Icon,
  AlertCircleIcon,
  Clock01Icon,
  Calendar01Icon,
  Upload01Icon,
  Building01Icon,
  Search01Icon,
  UserIcon,
  Mail01Icon,
  Briefcase01Icon,
  NoteIcon,
} from "@hugeicons/react";
import { getLeaveTypeLabel } from "@/lib/leave";

export type ReportMeta = {
  activeRange: "today" | "7d" | "30d" | "quarter" | "custom";
  startDate: string;
  endDate: string;
  rangeLabel: string;
};

export type ClientHealthSlice = {
  label: "Active & Healthy" | "Monitoring Required" | "Critical Status";
  value: number;
  color: string;
  href: string;
};

export type TrendPoint = {
  label: string;
  value: number;
  startDate: string;
  endDate: string;
  href: string;
};

export type DepartmentPerformanceRow = {
  department: string;
  subtitle: string;
  completed: number;
  met: number;
  missed: number;
  onTimeRate: number;
  avgCompletionHours: number;
  href: string;
};

export type ReportSummary = {
  trackedTasks: number;
  metCount: number;
  missedCount: number;
  complianceRate: number;
  avgCompletionHours: number;
  companyHealthBand: "Healthy" | "Watch" | "Critical";
  complianceDelta: number;
  metDelta: number;
  missedDelta: number;
  avgCompletionDelta: number;
};

export type EmployeeTaskRecord = {
  id: number;
  title: string;
  completedAt: string;
  slaStartedAt: string;
  slaHours: number;
  slaPausedDuration: number;
};

export type LeaveBalance = {
  type: string;
  daysAllowed: number;
  usedDays: number;
  remainingDays: number;
};

export type EmployeeReportCard = {
  id: number;
  name: string;
  email: string;
  role: string;
  departmentName: string;
  leaveBalances: LeaveBalance[];
  companyItemsOwned: number;
  personalDocuments: { id: number; name: string; url: string }[];
  dailyLogs: {
    id: number;
    note: string;
    markCompleted: boolean;
    taskTitle: string;
    projectTitle: string;
    createdAt: string;
  }[];
  tasks: EmployeeTaskRecord[];
};

interface Props {
  meta: ReportMeta;
  summary: ReportSummary;
  clientHealth: ClientHealthSlice[];
  trend: TrendPoint[];
  departments: DepartmentPerformanceRow[];
  employeeReports: EmployeeReportCard[];
  initialReportTab?: "company" | "employee";
}

function buildConicGradient(slices: ClientHealthSlice[]) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return "conic-gradient(#d9deea 0% 100%)";

  let cursor = 0;
  const parts: string[] = [];
  for (const slice of slices) {
    if (!slice.value) continue;
    const pct = (slice.value / total) * 100;
    parts.push(`${slice.color} ${cursor}% ${cursor + pct}%`);
    cursor += pct;
  }

  return `conic-gradient(${parts.join(", ")})`;
}

function buildLineCoordinates(values: number[], width: number, height: number, padding: number) {
  const max = Math.max(100, ...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : innerWidth;

  return values.map((value, index) => {
    const x = padding + index * step;
    const y = padding + (1 - value / max) * innerHeight;
    return { x, y };
  });
}

function pointsToString(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function areaPath(points: { x: number; y: number }[], width: number, height: number, padding: number) {
  if (points.length === 0) return "";
  const top = points.map((point) => `${point.x} ${point.y}`).join(" L ");
  const last = points[points.length - 1];
  const first = points[0];
  return `M ${first.x} ${height - padding} L ${top} L ${last.x} ${height - padding} Z`;
}

function deltaChip(delta: number, invert = false) {
  const positive = invert ? delta <= 0 : delta >= 0;
  const tone = positive
    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-300";
  const sign = delta > 0 ? "+" : "";
  return { tone, label: `${sign}${delta}%` };
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getStartOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getEndOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getStartOfWeek(date: Date) {
  const next = getStartOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function parseDateInput(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinRange(dateValue: string, start: Date, end: Date) {
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return false;
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

export default function ReportsClient({
  meta,
  summary,
  clientHealth,
  trend,
  departments,
  employeeReports,
  initialReportTab = "company",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeReportTab, setActiveReportTab] = useState<"company" | "employee">(initialReportTab);
  const [customStart, setCustomStart] = useState(meta.startDate);
  const [customEnd, setCustomEnd] = useState(meta.endDate);
  const [trendMode, setTrendMode] = useState<"monthly" | "quarterly">("monthly");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [docsEmployee, setDocsEmployee] = useState<{ name: string; docs: { id: number; name: string; url: string }[] } | null>(null);
  const [employeeDateRange, setEmployeeDateRange] = useState<"today" | "week" | "month" | "custom">("today");
  const [employeeCustomStart, setEmployeeCustomStart] = useState("");
  const [employeeCustomEnd, setEmployeeCustomEnd] = useState("");
  const [openedLogId, setOpenedLogId] = useState<number | null>(null);

  const donutBackground = buildConicGradient(clientHealth);
  const totalClientsForDonut = clientHealth.reduce((sum, s) => sum + s.value, 0);
  const healthySlice = clientHealth.find((s) => s.label === "Active & Healthy");
  const healthyPct = totalClientsForDonut > 0 ? Math.round(((healthySlice?.value || 0) / totalClientsForDonut) * 100) : 0;
  const healthSignal = useMemo(() => {
    if (healthyPct <= 50) {
      return {
        label: "Critical",
        ringClass: "bg-rose-500/30",
        textClass: "text-rose-600 dark:text-rose-300",
        pulseClass: "animate-pulse",
        pulseDuration: "1.4s",
      };
    }

    if (healthyPct >= 60) {
      return {
        label: "Healthy",
        ringClass: "bg-emerald-500/25",
        textClass: "text-emerald-600 dark:text-emerald-300",
        pulseClass: "",
        pulseDuration: "0s",
      };
    }

    return {
      label: "Caution",
      ringClass: "bg-amber-400/30",
      textClass: "text-amber-600 dark:text-amber-300",
      pulseClass: "animate-pulse",
      pulseDuration: "3.6s",
    };
  }, [healthyPct]);

  const lineWidth = 760;
  const lineHeight = 260;
  const linePadding = 26;
  const trendValues = trend.map((point) => point.value);
  const linePoints = buildLineCoordinates(trendValues, lineWidth, lineHeight, linePadding);
  const linePolyline = pointsToString(linePoints);
  const lineArea = areaPath(linePoints, lineWidth, lineHeight, linePadding);

  const complianceChip = deltaChip(summary.complianceDelta);
  const metChip = deltaChip(summary.metDelta);
  const missedChip = deltaChip(summary.missedDelta, true);
  const avgChip = deltaChip(summary.avgCompletionDelta);

  const exportRows = useMemo(() => {
    return departments.map((department) => ({
      Department: department.department,
      Completed: department.completed,
      "SLA Met": department.met,
      "SLA Missed": department.missed,
      "On Time Rate": `${department.onTimeRate}%`,
      "Avg Completion": `${department.avgCompletionHours} hrs`,
      Range: meta.rangeLabel,
    }));
  }, [departments, meta.rangeLabel]);

  const setRange = (dateRange: ReportMeta["activeRange"], overrides?: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides || {})) {
      params.set(key, value);
    }
    params.set("dateRange", dateRange);
    if (dateRange !== "custom") {
      params.delete("startDate");
      params.delete("endDate");
    }
    router.push(`/reports?${params.toString()}`);
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("dateRange", "custom");
    params.set("startDate", customStart);
    params.set("endDate", customEnd);
    router.push(`/reports?${params.toString()}`);
  };

  const switchReportTab = (tab: "company" | "employee") => {
    setActiveReportTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("reportTab", tab);
    router.push(`/reports?${params.toString()}`);
  };

  const exportCsv = () => {
    const lines = [
      ["Department", "Completed", "SLA Met", "SLA Missed", "On Time Rate", "Avg Completion", "Range"],
      ...exportRows.map((row) => [row.Department, row.Completed, row["SLA Met"], row["SLA Missed"], row["On Time Rate"], row["Avg Completion"], row.Range]),
    ];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `company-reports-${meta.startDate}-to-${meta.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print();
  };

  const DEPT_COLORS = [
    { bgClass: "bg-[#fde8ed] dark:bg-rose-950/40", iconClass: "text-[#c91f41] dark:text-rose-300" },
    { bgClass: "bg-[#dbeafe] dark:bg-blue-950/40", iconClass: "text-[#1d4ed8] dark:text-blue-300" },
    { bgClass: "bg-[#fef3c7] dark:bg-amber-950/40", iconClass: "text-[#b45309] dark:text-amber-300" },
    { bgClass: "bg-[#dcfce7] dark:bg-emerald-950/40", iconClass: "text-[#15803d] dark:text-emerald-300" },
    { bgClass: "bg-[#ede9fe] dark:bg-violet-950/40", iconClass: "text-[#6d28d9] dark:text-violet-300" },
    { bgClass: "bg-[#fce7f3] dark:bg-pink-950/40", iconClass: "text-[#be185d] dark:text-pink-300" },
    { bgClass: "bg-[#f0fdf4] dark:bg-green-950/40", iconClass: "text-[#166534] dark:text-green-300" },
    { bgClass: "bg-[#fef9c3] dark:bg-yellow-950/40", iconClass: "text-[#a16207] dark:text-yellow-300" },
    { bgClass: "bg-[#fff7ed] dark:bg-orange-950/40", iconClass: "text-[#c2410c] dark:text-orange-300" },
  ];

  const filteredEmployees = useMemo(() => {
    const needle = employeeSearch.trim().toLowerCase();
    if (!needle) return [];
    return employeeReports.filter((employee) => {
      return (
        employee.name.toLowerCase().includes(needle) ||
        employee.email.toLowerCase().includes(needle) ||
        employee.departmentName.toLowerCase().includes(needle)
      );
    });
  }, [employeeReports, employeeSearch]);

  const selectedEmployee = useMemo(() => {
    if (!filteredEmployees.length) return null;
    const explicit = filteredEmployees.find((employee) => employee.id === selectedEmployeeId);
    return explicit ?? filteredEmployees[0];
  }, [filteredEmployees, selectedEmployeeId]);

  const selectedEmployeeTasks = useMemo(() => {
    if (!selectedEmployee) return [] as EmployeeTaskRecord[];
    return selectedEmployee.tasks;
  }, [selectedEmployee]);

  const selectedEmployeeLogs = useMemo(() => {
    if (!selectedEmployee) return [] as EmployeeReportCard["dailyLogs"];
    return selectedEmployee.dailyLogs;
  }, [selectedEmployee]);

  const employeeRangeBounds = useMemo(() => {
    const now = new Date();

    if (employeeDateRange === "today") {
      return { start: getStartOfDay(now), end: getEndOfDay(now), label: "Today" };
    }

    if (employeeDateRange === "week") {
      return { start: getStartOfWeek(now), end: getEndOfDay(now), label: "This Week" };
    }

    if (employeeDateRange === "month") {
      return { start: getStartOfMonth(now), end: getEndOfDay(now), label: "This Month" };
    }

    const customStart = parseDateInput(employeeCustomStart);
    const customEnd = parseDateInput(employeeCustomEnd);
    if (!customStart || !customEnd) {
      return null;
    }

    return {
      start: getStartOfDay(customStart),
      end: getEndOfDay(customEnd),
      label: "Custom",
    };
  }, [employeeDateRange, employeeCustomStart, employeeCustomEnd]);

  const filteredSelectedEmployeeTasks = useMemo(() => {
    if (!employeeRangeBounds) return selectedEmployeeTasks;
    return selectedEmployeeTasks.filter((task) => isWithinRange(task.completedAt, employeeRangeBounds.start, employeeRangeBounds.end));
  }, [selectedEmployeeTasks, employeeRangeBounds]);

  const filteredSelectedEmployeeLogs = useMemo(() => {
    if (!employeeRangeBounds) return selectedEmployeeLogs;
    return selectedEmployeeLogs.filter((log) => isWithinRange(log.createdAt, employeeRangeBounds.start, employeeRangeBounds.end));
  }, [selectedEmployeeLogs, employeeRangeBounds]);

  const selectedEmployeeCompletedLogCount = useMemo(() => {
    return filteredSelectedEmployeeLogs.filter((log) => log.markCompleted).length;
  }, [filteredSelectedEmployeeLogs]);

  const mergedActivityRows = useMemo(() => {
    const taskRows = filteredSelectedEmployeeTasks.map((task) => ({
      id: `task-${task.id}`,
      logId: null,
      occurredAt: task.completedAt,
      source: "TASK_COMPLETED" as const,
      projectTitle: "-",
      taskTitle: task.title,
      note: "Task completed in workflow",
      result: "Completed",
    }));

    const logRows = filteredSelectedEmployeeLogs.map((log) => ({
      id: `log-${log.id}`,
      logId: log.id,
      occurredAt: log.createdAt,
      source: "DAILY_LOG" as const,
      projectTitle: log.projectTitle,
      taskTitle: log.taskTitle,
      note: log.note,
      result: log.markCompleted ? "Completed" : "Progress",
    }));

    return [...taskRows, ...logRows].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
  }, [filteredSelectedEmployeeTasks, filteredSelectedEmployeeLogs]);

  const totalCompletedTaskCount = filteredSelectedEmployeeTasks.length + selectedEmployeeCompletedLogCount;

  const selectedEmployeeAnnualLeave = useMemo(() => {
    if (!selectedEmployee) return null;
    return selectedEmployee.leaveBalances.find((lb) => lb.type.toLowerCase().includes("annual")) ?? null;
  }, [selectedEmployee]);

  const openedLog = useMemo(() => {
    if (!openedLogId) return null;
    return filteredSelectedEmployeeLogs.find((log) => log.id === openedLogId) ?? null;
  }, [openedLogId, filteredSelectedEmployeeLogs]);

  return (
    <div className="space-y-8 bg-[#f5f7fc] dark:bg-black -mx-8 -mt-8 px-8 py-8 lg:px-10 min-h-screen">
      <section className="space-y-2 max-w-3xl">
        <h1 className="text-[31px] leading-none font-black tracking-tight text-[#495f85] dark:text-white">Reports</h1>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 dark:bg-[#111111] border border-white dark:border-white/10 p-1.5 shadow-sm w-fit">
        <button
          onClick={() => switchReportTab("company")}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
            activeReportTab === "company"
              ? "bg-[#cf2145] text-white shadow-[0_8px_18px_rgba(207,33,69,0.22)]"
              : "text-[#6d7893] dark:text-zinc-400 hover:text-[#cf2145] dark:hover:text-rose-300"
          }`}
        >
          Company Report
        </button>
        <button
          onClick={() => switchReportTab("employee")}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
            activeReportTab === "employee"
              ? "bg-[#cf2145] text-white shadow-[0_8px_18px_rgba(207,33,69,0.22)]"
              : "text-[#6d7893] dark:text-zinc-400 hover:text-[#cf2145] dark:hover:text-rose-300"
          }`}
        >
          Employee Report
        </button>
      </section>

      {activeReportTab === "company" ? (
        <>
          <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 dark:bg-[#111111] border border-white dark:border-white/10 p-1.5 shadow-sm w-fit">
              {([
                { key: "today", label: "Today" },
                { key: "7d", label: "7D" },
                { key: "30d", label: "1M" },
                { key: "quarter", label: "Quarter" },
                { key: "custom", label: "Custom" },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setRange(item.key)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                    meta.activeRange === item.key
                      ? "bg-[#cf2145] text-white shadow-[0_8px_18px_rgba(207,33,69,0.22)]"
                      : "text-[#6d7893] dark:text-zinc-400 hover:text-[#cf2145] dark:hover:text-rose-300"
                  }`}
                >
                  {item.label}
                  {item.key === "custom" && (
                    <Calendar01Icon className="inline-block ml-1.5 h-3 w-3 align-middle" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {meta.activeRange === "custom" ? (
            <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-white bg-white/80 dark:bg-[#111111] dark:border-white/10 p-4 shadow-sm">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-11 rounded-2xl border border-[#e4e8f1] dark:border-white/10 bg-white dark:bg-[#0f0f10] px-4 text-sm font-medium text-[#33415d] dark:text-zinc-200 outline-none"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-11 rounded-2xl border border-[#e4e8f1] dark:border-white/10 bg-white dark:bg-[#0f0f10] px-4 text-sm font-medium text-[#33415d] dark:text-zinc-200 outline-none"
              />
              <button
                onClick={applyCustomRange}
                className="h-11 rounded-2xl bg-[#cf2145] px-5 text-[10px] font-black uppercase tracking-[0.18em] text-white"
              >
                Apply Range
              </button>
            </section>
          ) : null}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <MetricCard
              label="SLA Compliance"
              value={`${summary.complianceRate}%`}
              chip={complianceChip.label}
              chipTone={complianceChip.tone}
              icon={CheckmarkCircle01Icon}
              iconBgClass="bg-emerald-100 dark:bg-emerald-900/35"
              iconClass="text-emerald-600 dark:text-emerald-300"
            />
            <MetricCard
              label="SLA Met"
              value={summary.metCount.toLocaleString()}
              chip={metChip.label}
              chipTone={metChip.tone}
              accent
              icon={TaskDone01Icon}
              iconBgClass="bg-sky-100 dark:bg-sky-900/35"
              iconClass="text-sky-700 dark:text-sky-300"
            />
            <MetricCard
              label="SLA Missed"
              value={summary.missedCount.toLocaleString()}
              chip={missedChip.label}
              chipTone={missedChip.tone}
              icon={AlertCircleIcon}
              iconBgClass="bg-amber-100 dark:bg-amber-900/35"
              iconClass="text-amber-700 dark:text-amber-300"
            />
            <MetricCard
              label="Avg Completion"
              value={`${summary.avgCompletionHours}`}
              unit="hrs"
              chip={avgChip.label}
              chipTone={avgChip.tone}
              icon={Clock01Icon}
              iconBgClass="bg-violet-100 dark:bg-violet-900/35"
              iconClass="text-violet-700 dark:text-violet-300"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4 rounded-[28px] bg-[#eef2fb] dark:bg-[#111111] border border-white dark:border-white/10 p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[21px] leading-none font-black tracking-tight text-[#11203a] dark:text-white">Clients Health</h2>
          </div>

          <div className="mt-8 flex flex-col items-start gap-7">
            <div className="relative mx-auto h-56 w-56 rounded-full" style={{ background: donutBackground }}>
              <div
                className={cn("absolute -inset-2 rounded-full blur-xl", healthSignal.ringClass, healthSignal.pulseClass)}
                style={healthSignal.pulseClass ? { animationDuration: healthSignal.pulseDuration } : undefined}
              />
              <div className="absolute inset-[28px] rounded-full bg-white dark:bg-[#0f0f10] flex items-center justify-center text-center shadow-inner">
                <div>
                  <p className={cn("text-[40px] leading-none font-black", healthSignal.textClass)}>{healthyPct}%</p>
                  <p className={cn("mt-2 text-[10px] font-black uppercase tracking-[0.18em]", healthSignal.textClass)}>{healthSignal.label}</p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              {clientHealth.map((slice) => (
                <Link key={slice.label} href={slice.href} className="flex items-center justify-between gap-4 text-sm group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                    <span className="font-semibold text-[#49566f] dark:text-zinc-300 group-hover:text-[#cf2145]">{slice.label}</span>
                  </div>
                  <span className="font-black text-[#182845] dark:text-white">{slice.value}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 rounded-[28px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 p-7 shadow-sm overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[21px] leading-none font-black tracking-tight text-[#11203a] dark:text-white">SLA Trend</h2>
              <p className="mt-2 text-xs text-[#8d97aa] dark:text-zinc-500">Performance trajectory over the last 6 months</p>
            </div>
            <div className="inline-flex rounded-full bg-[#f6e9ed] dark:bg-[#2a1a20] p-1 text-[10px] font-black uppercase tracking-[0.12em]">
              <button
                onClick={() => setTrendMode("monthly")}
                className={`rounded-full px-3 py-1 transition-all ${trendMode === "monthly" ? "bg-[#cf2145] text-white" : "text-[#8d6f7c] dark:text-zinc-400"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTrendMode("quarterly")}
                className={`rounded-full px-3 py-1 transition-all ${trendMode === "quarterly" ? "bg-[#cf2145] text-white" : "text-[#8d6f7c] dark:text-zinc-400"}`}
              >
                Quarterly
              </button>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <svg viewBox={`0 0 ${lineWidth} ${lineHeight}`} className="w-full min-w-[680px] h-[280px]">
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                <line
                  key={ratio}
                  x1={linePadding}
                  y1={linePadding + ratio * (lineHeight - linePadding * 2)}
                  x2={lineWidth - linePadding}
                  y2={linePadding + ratio * (lineHeight - linePadding * 2)}
                  stroke="rgba(209,214,226,0.65)"
                  strokeWidth="1"
                />
              ))}
              <path d={lineArea} fill="rgba(207,33,69,0.08)" />
              <polyline fill="none" stroke="#cf2145" strokeWidth="3.5" points={linePolyline} />
              {linePoints.map((point, index) => (
                <Link key={trend[index].label} href={trend[index].href}>
                  <circle cx={point.x} cy={point.y} r="5" fill="#cf2145" className="cursor-pointer" />
                </Link>
              ))}
              {trend.map((point, index) => {
                const x = linePadding + ((lineWidth - linePadding * 2) / Math.max(1, trend.length - 1)) * index;
                return (
                  <text key={point.label} x={x} y={lineHeight - 8} textAnchor="middle" fontSize="10" fill="#9aa3b6">
                    {point.label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
          </section>

          <section className="rounded-[28px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-[21px] leading-none font-black tracking-tight text-[#11203a] dark:text-white">Department Performance</h2>
            <p className="mt-2 text-xs text-[#c91f41] dark:text-rose-300">Detailed metric breakdown by functional unit</p>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-2xl border border-[#ead9df] dark:border-[#5e2c39] bg-white dark:bg-[#181114] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#cf2145] dark:text-rose-300"
          >
            <Upload01Icon className="h-3.5 w-3.5 text-[#cf2145] dark:text-rose-300" />
            Export Dataset
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-[#edf0f6] dark:border-white/10 text-left text-[10px] font-black uppercase tracking-[0.18em] text-[#98a2b5] dark:text-zinc-500">
                <th className="px-3 py-4">Department</th>
                <th className="px-3 py-4">Completed</th>
                <th className="px-3 py-4">SLA Met</th>
                <th className="px-3 py-4">SLA Missed</th>
                <th className="px-3 py-4">On-Time Rate</th>
                <th className="px-3 py-4 text-right">Avg Completion</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((row, rowIndex) => (
                <tr key={row.department} className="border-b border-[#f3f5f9] dark:border-white/10 last:border-b-0 group">
                  <td className="px-3 py-5">
                    <Link href={row.href} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                          DEPT_COLORS[rowIndex % DEPT_COLORS.length].bgClass
                        )}
                      >
                        <Building01Icon
                          className={cn("h-4 w-4", DEPT_COLORS[rowIndex % DEPT_COLORS.length].iconClass)}
                        />
                      </div>
                      <p className="text-sm font-black text-[#182845] dark:text-white">{row.department}</p>
                    </Link>
                  </td>
                  <td className="px-3 py-5 text-sm font-bold text-[#22314b] dark:text-zinc-200">{row.completed}</td>
                  <td className="px-3 py-5 text-sm font-bold text-[#22314b] dark:text-zinc-200">{row.met}</td>
                  <td className="px-3 py-5 text-sm font-bold text-[#cf2145] dark:text-rose-300">{row.missed}</td>
                  <td className="px-3 py-5 w-[220px]">
                    <div className="space-y-1.5">
                      <div className="h-1.5 rounded-full bg-[#f0f2f7] dark:bg-zinc-800">
                        <div className="h-full rounded-full bg-[#cf2145]" style={{ width: `${Math.min(100, Math.max(0, row.onTimeRate))}%` }} />
                      </div>
                      <p className="text-[11px] font-black text-[#22314b] dark:text-zinc-300">{row.onTimeRate}%</p>
                    </div>
                  </td>
                  <td className="px-3 py-5 text-right text-sm font-bold text-[#22314b] dark:text-zinc-200">{row.avgCompletionHours} hrs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </section>
        </>
      ) : (
        <>
          <section className="rounded-[28px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 p-5 shadow-sm space-y-4">
            <div className="relative">
              <Search01Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8d97aa]" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employee by name, email, or department"
                className="h-12 w-full rounded-2xl border border-[#e6e9f2] dark:border-white/10 bg-white dark:bg-[#0f0f10] pl-12 pr-4 text-sm font-semibold text-[#22314b] dark:text-zinc-100 outline-none"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredEmployees.map((employee) => {
              const isActive = selectedEmployee?.id === employee.id;
              return (
                <button
                  key={employee.id}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  className={cn(
                    "text-left rounded-[24px] border bg-white p-5 shadow-sm transition-all dark:bg-[#111111]",
                    isActive
                      ? "border-[#cf2145] ring-1 ring-[#cf2145]/20 dark:border-[#cf2145]"
                      : "border-white dark:border-white/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-lg font-black text-[#182845] dark:text-white">{employee.name}</p>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8f98aa]">{employee.role}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-[#fde8ed] dark:bg-[#2b1a20] flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-[#cf2145]" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-[#51607a] dark:text-zinc-300">
                    <p className="flex items-center gap-2"><Mail01Icon className="h-4 w-4" /> {employee.email}</p>
                    <p className="flex items-center gap-2"><Briefcase01Icon className="h-4 w-4" /> {employee.departmentName}</p>
                  </div>
                  {employee.personalDocuments.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDocsEmployee({ name: employee.name, docs: employee.personalDocuments }); }}
                      className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#fef5f7] dark:bg-[#2b1a20] border border-[#f3d8de] dark:border-[#cf2145]/20 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#cf2145] hover:bg-[#fde8ed] dark:hover:bg-[#3b1f2a] transition-colors cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Documents
                    </button>
                  )}
                </button>
              );
            })}
          </section>

          {selectedEmployee ? (
            <section className="rounded-[28px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 p-7 shadow-sm space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[21px] leading-none font-black tracking-tight text-[#11203a] dark:text-white">
                    {selectedEmployee.name}
                  </h2>
                  <p className="mt-2 text-xs text-[#8d97aa] dark:text-zinc-500">
                    Employee task and log performance snapshot
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {([
                    { key: "today", label: "Today" },
                    { key: "week", label: "This Week" },
                    { key: "month", label: "This Month" },
                    { key: "custom", label: "Custom" },
                  ] as const).map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setEmployeeDateRange(item.key)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] transition-all",
                        employeeDateRange === item.key
                          ? "bg-[#cf2145] text-white shadow-[0_8px_18px_rgba(207,33,69,0.22)]"
                          : "bg-[#f5f7fc] text-[#6d7893] dark:bg-[#181818] dark:text-zinc-400"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {employeeDateRange === "custom" ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#edf0f6] dark:border-white/10 p-3">
                  <input
                    type="date"
                    value={employeeCustomStart}
                    onChange={(e) => setEmployeeCustomStart(e.target.value)}
                    className="h-10 rounded-xl border border-[#e4e8f1] dark:border-white/10 bg-white dark:bg-[#0f0f10] px-3 text-xs font-semibold text-[#33415d] dark:text-zinc-200 outline-none"
                  />
                  <input
                    type="date"
                    value={employeeCustomEnd}
                    onChange={(e) => setEmployeeCustomEnd(e.target.value)}
                    className="h-10 rounded-xl border border-[#e4e8f1] dark:border-white/10 bg-white dark:bg-[#0f0f10] px-3 text-xs font-semibold text-[#33415d] dark:text-zinc-200 outline-none"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <MetricCard
                  label="Tasks Completed"
                  value={String(totalCompletedTaskCount)}
                  chip={employeeRangeBounds?.label ?? "All Time"}
                  chipTone="bg-sky-50 text-sky-700"
                  icon={TaskDone01Icon}
                  iconBgClass="bg-sky-100"
                  iconClass="text-sky-700"
                />
                <MetricCard
                  label="Daily Logs"
                  value={String(filteredSelectedEmployeeLogs.length)}
                  chip={employeeRangeBounds?.label ?? "All Time"}
                  chipTone="bg-blue-50 text-blue-700"
                  icon={NoteIcon}
                  iconBgClass="bg-blue-100"
                  iconClass="text-blue-700"
                />
                <MetricCard
                  label="Completed in Logs"
                  value={String(selectedEmployeeCompletedLogCount)}
                  chip={employeeRangeBounds?.label ?? "Marked Complete"}
                  chipTone="bg-emerald-50 text-emerald-700"
                  icon={CheckmarkCircle01Icon}
                  iconBgClass="bg-emerald-100"
                  iconClass="text-emerald-700"
                />
                {!selectedEmployeeAnnualLeave ? (
                  <MetricCard
                    label="Annual Leave Left"
                    value="N/A"
                    chip="No Policy"
                    chipTone="bg-slate-50 text-slate-500"
                    icon={Calendar01Icon}
                    iconBgClass="bg-slate-100"
                    iconClass="text-slate-500"
                  />
                ) : (
                  <MetricCard
                    label="Annual Leave Left"
                    value={formatDecimal(selectedEmployeeAnnualLeave.remainingDays)}
                    chip="Current Year"
                    chipTone="bg-emerald-50 text-emerald-700"
                    icon={Calendar01Icon}
                    iconBgClass="bg-emerald-100"
                    iconClass="text-emerald-700"
                  />
                )}
              </div>

              <div className="rounded-2xl border border-[#edf0f6] dark:border-white/10 overflow-hidden">
                <div className="max-h-[520px] overflow-y-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-[#f7f9fc] dark:bg-[#181818]">
                      <tr className="text-left text-[10px] font-black uppercase tracking-[0.16em] text-[#98a2b5]">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3 text-right">Result</th>
                        <th className="px-4 py-3 text-right">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergedActivityRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-[#7f8aa1]">
                            No completed tasks or logs available.
                          </td>
                        </tr>
                      ) : (
                        mergedActivityRows.map((row) => (
                          <tr key={row.id} className="border-t border-[#f0f2f7] dark:border-white/10">
                            <td className="px-4 py-3 text-sm text-[#5f6c86] dark:text-zinc-400">
                              {new Date(row.occurredAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-[#23324c] dark:text-zinc-200">
                              {row.source === "TASK_COMPLETED" ? "Task Completion" : "Daily Log"}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-[#23324c] dark:text-zinc-200">{row.projectTitle}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-[#23324c] dark:text-zinc-200">{row.taskTitle}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold">
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]",
                                  row.result === "Completed"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                                )}
                              >
                                {row.result}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.source === "DAILY_LOG" && row.logId ? (
                                <button
                                  onClick={() => setOpenedLogId(row.logId)}
                                  className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] bg-[#fde8ed] text-[#cf2145] dark:bg-[#2b1a20] dark:text-rose-300"
                                >
                                  View Log
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-[#9aa3b6]">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {selectedEmployee && openedLog ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
              <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white dark:bg-[#111111] p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-[#11203a] dark:text-white">Daily Log Details</h3>
                    <p className="mt-1 text-xs font-semibold text-[#8d97aa]">Full entry information</p>
                  </div>
                  <button
                    onClick={() => setOpenedLogId(null)}
                    className="rounded-xl border border-[#e6e9f2] dark:border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#6d7893] dark:text-zinc-300"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <div className="rounded-xl bg-[#f6f7fb] dark:bg-[#19191a] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9aa3b6]">Employee</p>
                    <p className="mt-1 font-bold text-[#23324c] dark:text-zinc-200">{selectedEmployee.name}</p>
                  </div>
                  <div className="rounded-xl bg-[#f6f7fb] dark:bg-[#19191a] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9aa3b6]">Email</p>
                    <p className="mt-1 font-bold text-[#23324c] dark:text-zinc-200">{selectedEmployee.email}</p>
                  </div>
                  <div className="rounded-xl bg-[#f6f7fb] dark:bg-[#19191a] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9aa3b6]">Department</p>
                    <p className="mt-1 font-bold text-[#23324c] dark:text-zinc-200">{selectedEmployee.departmentName}</p>
                  </div>
                  <div className="rounded-xl bg-[#f6f7fb] dark:bg-[#19191a] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9aa3b6]">Date</p>
                    <p className="mt-1 font-bold text-[#23324c] dark:text-zinc-200">{new Date(openedLog.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-[#f6f7fb] dark:bg-[#19191a] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9aa3b6]">Project</p>
                    <p className="mt-1 font-bold text-[#23324c] dark:text-zinc-200">{openedLog.projectTitle}</p>
                  </div>
                  <div className="rounded-xl bg-[#f6f7fb] dark:bg-[#19191a] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9aa3b6]">Task</p>
                    <p className="mt-1 font-bold text-[#23324c] dark:text-zinc-200">{openedLog.taskTitle}</p>
                  </div>
                  <div className="rounded-xl bg-[#f6f7fb] dark:bg-[#19191a] p-3 sm:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9aa3b6]">Note</p>
                    <p className="mt-1 font-semibold text-[#23324c] dark:text-zinc-200 whitespace-pre-wrap">{openedLog.note}</p>
                  </div>
                  <div className="rounded-xl bg-[#f6f7fb] dark:bg-[#19191a] p-3 sm:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9aa3b6]">Status</p>
                    <p className="mt-1 font-bold text-[#23324c] dark:text-zinc-200">
                      {openedLog.markCompleted ? "Marked Complete" : "In Progress"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {employeeSearch.trim().length === 0 ? (
            <section className="rounded-[28px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 p-8 text-sm font-semibold text-[#7f8aa1]">
              Type in the search box to show employee cards.
            </section>
          ) : filteredEmployees.length === 0 ? (
            <section className="rounded-[28px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 p-8 text-sm font-semibold text-[#7f8aa1]">
              No employees match your search.
            </section>
          ) : null}
        </>
      )}

      {docsEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDocsEmployee(null)}>
          <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#cf2145]">Documents</p>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">{docsEmployee.name}</h3>
              </div>
              <button onClick={() => setDocsEmployee(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <X className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-[320px] overflow-y-auto space-y-2">
              {docsEmployee.docs.map(doc => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:bg-[#fef5f7] dark:hover:bg-[#2b1a20] hover:border-[#f3d8de] dark:hover:border-[#cf2145]/20 transition-all"
                >
                  <div className="h-9 w-9 rounded-xl bg-[#fef5f7] dark:bg-[#2b1a20] flex items-center justify-center shrink-0 group-hover:bg-[#fde8ed] dark:group-hover:bg-[#3b1f2a] transition-colors">
                    <FileText className="h-4 w-4 text-[#cf2145]" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#cf2145] dark:group-hover:text-[#cf2145] transition-colors truncate">{doc.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-auto text-gray-300 dark:text-zinc-600 group-hover:text-[#cf2145] dark:group-hover:text-[#cf2145] transition-colors shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  chip,
  chipTone,
  accent = false,
  icon: Icon,
  iconBgClass,
  iconClass,
}: {
  label: string;
  value: string;
  unit?: string;
  chip: string;
  chipTone: string;
  accent?: boolean;
  icon: React.ElementType;
  iconBgClass: string;
  iconClass: string;
}) {
  return (
    <div className={`rounded-[26px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 px-6 py-5 shadow-sm ${accent ? "ring-1 ring-inset ring-[#cf2145]/15" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconBgClass)}>
          <Icon className={cn("h-5 w-5", iconClass)} />
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${chipTone}`}>
          {chip}
        </span>
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#98a2b5]">{label}</p>
      <div className="mt-2 flex items-end gap-1.5">
        <p className="text-[42px] leading-none font-black text-[#11203a] dark:text-white">{value}</p>
        {unit ? <span className="pb-1 text-sm font-bold text-[#7e879b] dark:text-zinc-400">{unit}</span> : null}
      </div>
    </div>
  );
}
