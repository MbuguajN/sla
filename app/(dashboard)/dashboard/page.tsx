import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { clearLatestActivity } from "@/app/actions/taskActions";
import {
  ClipboardIcon,
  Tick02Icon,
  UserMultipleIcon,
  PlayIcon,
  Clock01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  TaskDone01Icon,
  Add01Icon,
  CheckmarkCircle01Icon,
  Calendar01Icon,
  Message01Icon,
  Settings02Icon,
} from "@hugeicons/react";
import { DashboardSkeleton, ListSkeleton } from "@/components/skeletons";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import DeadlineCalendarClient from "./DeadlineCalendarClient";
import { getLeaveDurationLabel, getLeaveTypeLabel } from "@/lib/leave";

export const dynamic = "force-dynamic";

async function getFinanceDashboardData() {
  const [requisitions, refunds] = await Promise.all([
    db.requisition.findMany({
      include: { user: { include: { department: true } } },
      where: { status: { in: ["PENDING_MANAGER", "PENDING_FINANCE"] } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.refund.findMany({
      include: { user: { include: { department: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return { requisitions, refunds };
}

async function getHRDashboardData() {
  const now = new Date();
  const [leaves, suggestions, pendingLeaves, openSuggestions, employeesOnLeave] = await Promise.all([
    db.leave.findMany({
      include: { user: { include: { department: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.suggestion.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    db.leave.count({ where: { status: "PENDING" } }),
    db.suggestion.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    db.leave.count({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),
  ]);

  const activeLeaveRequests = leaves.filter((item) => item.status === "PENDING").length;
  const newSuggestions = suggestions.filter((item) => item.status === "OPEN").length;
  const pendingReviews = pendingLeaves + openSuggestions;

  return {
    leaves,
    suggestions,
    activeLeaveRequests,
    newSuggestions,
    pendingReviews,
    employeesOnLeave,
  };
}

async function getCEODashboardData() {
  const now = new Date();

  const [employeesOnPremise, activeClients, activeProjects, pendingTasks, inProgressTasks, activeTasks, criticalTasks, employeesOutOfOffice] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.client.count({ where: { projects: { some: {} } } }),
    db.project.count({ where: { status: "ACTIVE" } }),
    db.task.count({ where: { status: { in: ["UNASSIGNED", "ASSIGNED", "CONFIRMED"] } } }),
    db.task.count({ where: { status: "IN_PROGRESS" } }),
    db.task.findMany({
      where: { status: { in: ["CONFIRMED", "IN_PROGRESS", "PAUSED"] } },
      include: { project: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    db.task.findMany({
      where: {
        status: { notIn: ["DONE", "CANCELLED"] },
        slaHours: { not: null },
        slaStartedAt: { not: null },
      },
      include: {
        project: { include: { client: true } },
        assignedDepartment: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    db.leave.count({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),
  ]);

  const inboundCapacity = Math.max(1, Math.ceil(pendingTasks * 1.08));
  const activeStations = Math.max(1, Math.ceil((inProgressTasks || 1) * 1.2));
  const fleetOnRoad = Math.max(1, inProgressTasks);

  const criticalSlas = criticalTasks
    .map((task) => {
      const started = task.slaStartedAt ? new Date(task.slaStartedAt).getTime() : null;
      const totalMs = task.slaHours ? task.slaHours * 60 * 60 * 1000 : null;
      if (!started || !totalMs) return null;

      const elapsed = now.getTime() - started - (task.slaPausedDuration || 0) * 1000;
      const remainingMs = totalMs - elapsed;
      const pct = Math.round((elapsed / totalMs) * 100);

      if (remainingMs <= 0 || pct >= 85) {
        const minutes = Math.max(1, Math.floor(Math.abs(remainingMs) / 60000));
        const breached = remainingMs <= 0;
        return {
          id: task.id,
          region: (task.assignedDepartment?.name || task.project?.client?.name || "Operations").toUpperCase(),
          title: task.title,
          note: breached
            ? `Breached by ${minutes}m - Priority Critical`
            : `Nearing breach (${Math.max(0, Math.floor(remainingMs / 60000))}m remaining)`,
        };
      }

      return null;
    })
    .filter((item): item is { id: number; region: string; title: string; note: string } => Boolean(item))
    .slice(0, 2);

  return {
    employeesOnPremise,
    activeClients,
    activeProjects,
    pendingTasks,
    inboundCapacity,
    inProgressTasks,
    activeStations,
    fleetOnRoad,
    activeTasks,
    criticalSlas,
    employeesOutOfOffice,
  };
}

async function CEODashboardSection() {
  const {
    employeesOnPremise,
    activeClients,
    activeProjects,
    pendingTasks,
    inboundCapacity,
    inProgressTasks,
    activeStations,
    fleetOnRoad,
    activeTasks,
    criticalSlas,
    employeesOutOfOffice,
  } = await getCEODashboardData();

  const inboundPct = Math.min(100, Math.round((pendingTasks / inboundCapacity) * 100));
  const pickingPct = Math.min(100, Math.round((inProgressTasks / activeStations) * 100));
  const fleetPct = Math.min(100, Math.round((fleetOnRoad / Math.max(fleetOnRoad + 6, 1)) * 100));

  const getActiveTaskProgress = (task: { status: string }) => {
    switch (task.status) {
      case "CONFIRMED":
        return 28;
      case "IN_PROGRESS":
        return 68;
      case "PAUSED":
        return 52;
      default:
        return 20;
    }
  };

  return (
    <div className="space-y-7">
      <section>
          <h1 className="text-[44px] leading-none font-black tracking-tight text-[#111f34] dark:text-white">Executive Dashboard</h1>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white dark:bg-[#111111] p-4 border border-[#e6eaf2] dark:border-white/10">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#7f8896] dark:text-zinc-500">Employees On Premise</p>
          <div className="mt-2 h-0.5 w-6 rounded-full bg-[#c91f41]" />
          <div className="mt-5 space-y-2">
            <p className="text-[34px] leading-none font-black text-[#122038] dark:text-white">{employeesOnPremise.toLocaleString()}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#7f8896] dark:text-zinc-500">{employeesOutOfOffice} employees out of office</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111111] p-4 border border-[#e6eaf2] dark:border-white/10">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#7f8896] dark:text-zinc-500">Active Clients</p>
          <div className="mt-2 h-0.5 w-6 rounded-full bg-[#c91f41]" />
          <div className="mt-5 space-y-2">
            <p className="text-[34px] leading-none font-black text-[#122038] dark:text-white">{activeClients.toLocaleString()}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#7f8896] dark:text-zinc-500">Live client accounts</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111111] p-4 border border-[#e6eaf2] dark:border-white/10">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#7f8896] dark:text-zinc-500">Active Projects</p>
          <div className="mt-2 h-0.5 w-6 rounded-full bg-[#c91f41]" />
          <div className="mt-5 space-y-2">
            <p className="text-[34px] leading-none font-black text-[#122038] dark:text-white">{activeProjects.toLocaleString()}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#7f8896] dark:text-zinc-500">Current open initiatives</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[30px] leading-none font-black tracking-tight text-[#1f2d43] dark:text-white">Operational Tasks</h2>
            <Link href="/tasks" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c91f41] hover:text-[#a61a35]">
              View Log
            </Link>
          </div>

          <div className="rounded-2xl bg-[#eef3fb] dark:bg-white/5 border border-[#e2e8f2] dark:border-white/10 p-4 space-y-4">
            {activeTasks.length > 0 ? (
              activeTasks.map((task) => {
                const progress = getActiveTaskProgress(task);
                return (
                  <div key={task.id} className="rounded-xl bg-white dark:bg-[#111111] px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-[12px] font-black text-[#223149] dark:text-white">
                      <div className="min-w-0">
                        <p className="truncate">{task.title}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c95a3] dark:text-zinc-500 truncate">
                          {task.project.title}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-black text-[#7d8796] dark:text-zinc-400">{progress}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#e7edf8] dark:bg-white/10">
                      <div className="h-full rounded-full bg-[#c91f41]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl bg-white dark:bg-[#111111] px-4 py-6 text-center">
                <p className="text-sm font-bold text-[#223149] dark:text-white">No active tasks at the moment</p>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <h2 className="text-[30px] leading-none font-black tracking-tight text-[#c91f41]">Critical SLAs</h2>
          <div className="rounded-2xl bg-[#fff6f8] dark:bg-[#c91f41]/5 border border-[#f4dde4] dark:border-[#c91f41]/20 p-5 space-y-5">
            {criticalSlas.length > 0 ? (
              criticalSlas.map((item) => (
                <div key={item.id} className="border-l-2 border-[#c91f41] pl-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9aa1ae]">{item.region}</p>
                  <p className="mt-1 text-[19px] leading-tight font-black text-[#1f2d43] dark:text-white">{item.title}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#d45b72]">{item.note}</p>
                </div>
              ))
            ) : (
              <div className="border-l-2 border-[#c91f41] pl-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9aa1ae]">System Wide</p>
                <p className="mt-1 text-[19px] leading-tight font-black text-[#1f2d43] dark:text-white">No Critical SLA Breaches</p>
                <p className="mt-1 text-[11px] font-bold text-[#7d8697] dark:text-zinc-500">All tracked work is within acceptable SLA thresholds.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function formatFinanceDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getRequisitionFlow(status: string) {
  switch (status) {
    case "PENDING_MANAGER":
      return { label: "Manager Review", dot: "bg-amber-500", text: "text-amber-600" };
    case "PENDING_FINANCE":
      return { label: "Finance Review", dot: "bg-emerald-500", text: "text-emerald-600" };
    default:
      return { label: status.replaceAll("_", " "), dot: "bg-slate-400", text: "text-slate-500" };
  }
}

function getRefundVelocity(status: string) {
  switch (status) {
    case "APPROVED":
      return { label: "Processed", dot: "bg-emerald-500", text: "text-emerald-600" };
    case "PENDING":
      return { label: "In Transit", dot: "bg-amber-500", text: "text-amber-600" };
    case "DENIED":
      return { label: "Flagged", dot: "bg-rose-500", text: "text-rose-600" };
    default:
      return { label: status, dot: "bg-slate-400", text: "text-slate-500" };
  }
}

function getLeavePill(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-600";
    case "DENIED":
      return "bg-rose-50 text-rose-600";
    case "PENDING":
      return "bg-amber-50 text-amber-600";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getSuggestionCategoryPill(category: string) {
  switch (category) {
    case "SUGGESTION":
      return "bg-rose-50 text-rose-600";
    case "FEEDBACK":
      return "bg-blue-50 text-blue-600";
    case "COMPLAINT":
      return "bg-orange-50 text-orange-600";
    case "REQUEST":
      return "bg-purple-50 text-purple-600";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatCompactDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(date);
}

async function HRDashboardSection() {
  const {
    leaves,
    suggestions,
    activeLeaveRequests,
    newSuggestions,
    employeesOnLeave,
  } = await getHRDashboardData();

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-white dark:bg-[#111111] border border-slate-100 dark:border-white/10 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] dark:shadow-none">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
              <Calendar01Icon className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{String(activeLeaveRequests).padStart(2, "0")}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-zinc-500">Active Leave Requests</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-600">
            <span>Pending approvals now</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111111] border border-slate-100 dark:border-white/10 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] dark:shadow-none">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Message01Icon className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{String(newSuggestions).padStart(2, "0")}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-zinc-500">New Suggestions</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-600">
            <span>Open and in-review items</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111111] border border-slate-100 dark:border-white/10 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] dark:shadow-none">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Settings02Icon className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{String(employeesOnLeave).padStart(2, "0")}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-zinc-500">Employees On Leave</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-600">
            <span>Approved and currently active</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Leave Requests</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-500">Real-time status of employee attendance planning</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#111111] shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] dark:shadow-none">
            <div className="h-[320px] overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-0">
              <thead>
                <tr className="text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <th className="sticky top-0 z-10 bg-white dark:bg-[#111111] px-5 py-4 border-b border-slate-100 dark:border-white/10">Employee</th>
                  <th className="sticky top-0 z-10 bg-white dark:bg-[#111111] px-4 py-4 border-b border-slate-100 dark:border-white/10">Type</th>
                  <th className="sticky top-0 z-10 bg-white dark:bg-[#111111] px-4 py-4 border-b border-slate-100 dark:border-white/10">Duration</th>
                  <th className="sticky top-0 z-10 bg-white dark:bg-[#111111] px-4 py-4 border-b border-slate-100 dark:border-white/10">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {leaves.map((leave) => (
                  <tr
                    key={leave.id}
                    className="text-sm text-slate-700 dark:text-zinc-400 align-middle hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <Link href={`/hr/leaves/${leave.id}`} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[10px] font-black text-rose-500">
                          {leave.user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 dark:text-white leading-tight truncate">{leave.user.name}</p>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{leave.user.department?.name || "Unassigned"}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/hr/leaves/${leave.id}`} className="text-xs font-semibold text-slate-700 capitalize whitespace-nowrap block">
                        {getLeaveTypeLabel(leave.type)}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/hr/leaves/${leave.id}`} className="block whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-700">{getLeaveDurationLabel(leave.duration)}</p>
                        <p className="text-[10px] text-slate-500">
                          {formatCompactDate(leave.startDate)} - {formatCompactDate(leave.endDate)}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/hr/leaves/${leave.id}`} className="block">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em]", getLeavePill(leave.status))}>
                          {leave.status}
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Culture Lab</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-500">All employee suggestions in one review table</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#111111] shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] dark:shadow-none">
            <div className="h-[320px] overflow-y-auto overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <th className="sticky top-0 z-10 bg-white dark:bg-[#111111] px-5 py-4 border-b border-slate-100 dark:border-white/10">Latest Suggestions</th>
                      <th className="sticky top-0 z-10 bg-white dark:bg-[#111111] px-4 py-4 border-b border-slate-100 dark:border-white/10 text-right">Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {suggestions.map((suggestion) => (
                    <tr key={suggestion.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4">
                        <Link href={`/hr/suggestions/${suggestion.id}`} className="block group">
                          <p className="text-sm font-black text-slate-800 dark:text-white group-hover:text-[#c91f41] leading-snug line-clamp-2 transition-colors">
                            {suggestion.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Submitted {formatTimeAgo(suggestion.createdAt)}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em]", getSuggestionCategoryPill(suggestion.category))}>
                          {suggestion.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center border-t border-slate-100 dark:border-white/10 p-4">
              <Link href="/hr/suggestions" className="inline-flex items-center gap-2 text-sm font-black text-slate-600 dark:text-zinc-400 hover:text-[#c91f41] transition-colors">
                View All Suggestions
                <span>-&gt;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

async function FinanceDashboardSection() {
  const { requisitions, refunds } = await getFinanceDashboardData();

  return (
    <div className="space-y-12">
      <section className="space-y-3">
        <h1 className="text-[2.1rem] leading-none font-black tracking-tight text-slate-700 dark:text-white">Ledger Oversight</h1>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 w-full">
            <h2 className="text-[1.35rem] font-black tracking-tight text-slate-800 dark:text-white">New Requisitions</h2>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>
          <Link href="/finance/requisitions" className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c91f41] whitespace-nowrap">
            Review Queue
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111111] shadow-sm dark:shadow-none">
          <div className="overflow-x-auto overflow-y-auto max-h-[260px]">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50/80 dark:bg-white/5">
              <tr className="text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                <th className="px-6 py-4">Date Applied</th>
                <th className="px-6 py-4">Requisition ID</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Requested Amount</th>
                <th className="px-6 py-4">Approval Flow</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((item) => {
                const flow = getRequisitionFlow(item.status);
                return (
                    <tr key={item.id} className="border-t border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-zinc-400">
                      <td className="px-6 py-5 font-medium">{formatFinanceDate(item.createdAt)}</td>
                      <td className="px-6 py-5 font-black text-[#c91f41]">#RQ-{item.id}</td>
                      <td className="px-6 py-5">{item.user.department?.name || "Operations"}</td>
                      <td className="px-6 py-5 font-black text-slate-800 dark:text-white">${item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-5">
                      <span className={cn("inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]", flow.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", flow.dot)} />
                        {flow.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link href="/finance/requisitions" className="font-bold text-[#c91f41] hover:text-[#a61a35]">
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 w-full">
            <h2 className="text-[1.35rem] font-black tracking-tight text-slate-800 dark:text-white">Recent Refunds</h2>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>
          <Link href="/finance/refunds" className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 whitespace-nowrap">
            View Historical Data
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111111] shadow-sm dark:shadow-none">
          <div className="overflow-x-auto overflow-y-auto max-h-[260px]">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50/80 dark:bg-white/5">
              <tr className="text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                <th className="px-6 py-4">Settlement Date</th>
                <th className="px-6 py-4">Reference #</th>
                <th className="px-6 py-4">Payee</th>
                <th className="px-6 py-4">Settled Amount</th>
                <th className="px-6 py-4">Velocity Status</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((item) => {
                const velocity = getRefundVelocity(item.status);
                return (
                    <tr key={item.id} className="border-t border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-zinc-400">
                      <td className="px-6 py-5 font-medium">{formatFinanceDate(item.createdAt)}</td>
                      <td className="px-6 py-5 font-medium text-slate-600 dark:text-zinc-400">#RF-{item.id}</td>
                      <td className="px-6 py-5">{item.user.name}</td>
                      <td className="px-6 py-5 font-black text-rose-600">-${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-5">
                      <span className={cn("inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]", velocity.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", velocity.dot)} />
                        {velocity.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link href="/finance/refunds" className="font-bold text-[#c91f41] hover:text-[#a61a35]">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </div>
  );
}

async function getStats(user: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [openTasks, doneTasks, teamMembers, doneToday, openBoardCards, openChecklistItems, doneBoardCards, doneChecklistItems, doneBoardCardsToday, doneChecklistItemsToday] = await Promise.all([
    db.task.count({
      where: {
        OR: [
          { assignedUserId: user.id },
          ...(user.role === "MANAGER" && user.departmentId
            ? [{ deptId: user.departmentId }]
            : []),
          ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
        ],
        status: { notIn: ["DONE", "CANCELLED"] },
      },
    }),
    db.task.count({
      where: {
        OR: [
          { assignedUserId: user.id },
          ...(user.role === "MANAGER" && user.departmentId
            ? [{ deptId: user.departmentId }]
            : []),
          ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
        ],
        status: "DONE",
      },
    }),
    user.departmentId
      ? db.user.findMany({ 
          where: { departmentId: user.departmentId, isActive: true },
          select: { id: true, name: true },
          take: 5 
        })
      : db.user.findMany({ 
          where: { isActive: true },
          select: { id: true, name: true },
          take: 5 
        }),
    db.task.count({
      where: {
        status: "DONE",
        updatedAt: { gte: today },
        OR: [
          { assignedUserId: user.id },
          ...(user.role === "MANAGER" && user.departmentId
            ? [{ deptId: user.departmentId }]
            : []),
          ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
        ],
      }
    }),
    db.boardCard.count({
      where: {
        OR: [
          { assignedToUserId: user.id },
          { members: { some: { userId: user.id } } }
        ],
        isCompleted: false,
      },
    }),
    db.boardChecklistItem.count({
      where: {
        assignedUserId: user.id,
        isDone: false,
      },
    }),
    db.boardCard.count({
      where: {
        OR: [
          { assignedToUserId: user.id },
          { members: { some: { userId: user.id } } }
        ],
        isCompleted: true,
      },
    }),
    db.boardChecklistItem.count({
      where: {
        assignedUserId: user.id,
        isDone: true,
      },
    }),
    db.boardCard.count({
      where: {
        OR: [
          { assignedToUserId: user.id },
          { members: { some: { userId: user.id } } }
        ],
        isCompleted: true,
        updatedAt: { gte: today },
      },
    }),
    db.boardChecklistItem.count({
      where: {
        assignedUserId: user.id,
        isDone: true,
        updatedAt: { gte: today },
      },
    }),
  ]);
  return { openTasks, doneTasks, teamMembers, doneToday, openBoardCards, openChecklistItems, doneBoardCards, doneChecklistItems, doneBoardCardsToday, doneChecklistItemsToday };
}

async function getActivityData(user: any) {
  const [activeTasks, recentActivities, publicHolidays] = await Promise.all([
    db.task.findMany({
      where: {
        OR: [
          { assignedUserId: user.id },
          ...(user.role === "MANAGER" && user.departmentId
            ? [{ deptId: user.departmentId }]
            : []),
          // Business Development gets activity for tasks they initiated
          ...(user.departmentSlug === "business-development"
            ? [{ createdById: user.id }]
            : []),
          ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
        ],
        status: { in: ["CONFIRMED", "IN_PROGRESS", "PAUSED"] },
      },
      include: {
        project: { include: { client: true } },
        assignedTo: true,
      },
      // Select extra fields for deadline calendar
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    db.activityLog.findMany({
      where: {
        OR: [
          // User's own activity
          { userId: user.id },
          // Manager sees department activity
          ...(user.role === "MANAGER" && user.departmentId
            ? [{ task: { deptId: user.departmentId } }]
            : []),
          // Business Development sees progression of tasks they assigned
          ...(user.departmentSlug === "business-development"
            ? [{ task: { createdById: user.id } }]
            : []),
          // Initiator sees developments of their task
          { task: { createdById: user.id } },
          // Assignee sees developments of their task
          { task: { assignedUserId: user.id } },
          // CEO/Admin sees everything
          ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
        ],
        // Allow hiding activities from dashboard (handled by the clear function)
        isHiddenFromDashboard: false,
      },
      include: { user: true, task: { include: { project: { include: { client: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.publicHoliday.findMany({
      orderBy: { date: "asc" },
      select: {
        id: true,
        name: true,
        date: true,
      },
    }),
  ]);
  return { activeTasks, recentActivities, publicHolidays };
}

async function getBoardDashboardData(user: any) {
  const [boardCards, checklistItems, cardActivities, workspaceJoins] = await Promise.all([
    db.boardCard.findMany({
      where: {
        OR: [
          { assignedToUserId: user.id },
          { members: { some: { userId: user.id } } }
        ],
        isCompleted: false,
        dueDate: { not: null }
      },
      include: {
        list: { include: { board: { include: { workspace: true } } } },
        members: { include: { user: true } }
      },
      orderBy: { dueDate: 'asc' }
    }),
    db.boardChecklistItem.findMany({
      where: {
        assignedUserId: user.id,
        isDone: false
      },
      include: {
        checklist: { include: { card: { include: { list: { include: { board: true } } } } } }
      }
    }),
    db.boardCardActivity.findMany({
      where: {
        card: {
          OR: [
            { assignedToUserId: user.id },
            { members: { some: { userId: user.id } } }
          ]
        }
      },
      include: { card: { include: { list: { include: { board: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    db.workspaceMember.findMany({
      where: {
        workspace: { ownerId: user.id },
        userId: { not: user.id }
      },
      include: { workspace: true, user: true },
      orderBy: { joinedAt: 'desc' },
      take: 10
    })
  ]);
  return { boardCards, checklistItems, cardActivities, workspaceJoins };
}

function formatActivityDescription(activity: any) {
  const title = activity.task?.title;
  const projectTitle = activity.task?.project?.title;

  if (title && projectTitle) {
    return `${activity.description} - ${title} (${projectTitle})`;
  }

  if (title) {
    return `${activity.description} - ${title}`;
  }

  return activity.description;
}

async function StatsSection({ user, canCreateTask }: { user: any, canCreateTask: boolean }) {
  const { openTasks, doneTasks, teamMembers, doneToday, openBoardCards, openChecklistItems, doneBoardCards, doneChecklistItems, doneBoardCardsToday, doneChecklistItemsToday } = await getStats(user);
  
  const canSeeAddTaskInCard = 
    user.role === "ADMIN" || 
    user.role === "CEO" || 
    user.departmentSlug === "client-service" || 
    user.departmentSlug === "business-development";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="group relative overflow-hidden bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/10 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none hover:-translate-y-1">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#c91f41]" />
        <div className="flex items-start justify-between">
          <div className="space-y-4 w-full">
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-[0.15em]">Tasks Pending</p>
              <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mt-1">{openTasks + openBoardCards + openChecklistItems}</p>
            </div>
            {canSeeAddTaskInCard && (
              <Link href="/tasks/new" className="flex items-center gap-2 text-[#c91f41] hover:text-[#a81a36] transition-colors group/btn">
                <div className="w-8 h-8 rounded-lg bg-[#fff1f2] flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                  <Add01Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold tracking-tight">Add New Task</span>
              </Link>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#fff1f2] flex items-center justify-center flex-shrink-0">
            <ClipboardIcon className="h-5 w-5 text-[#c91f41]" />
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/10 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none hover:-translate-y-1">
        <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-[0.15em]">Completed Total</p>
              <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mt-1">{doneTasks + doneBoardCards + doneChecklistItems}</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/15 flex items-center justify-center">
                  <CheckmarkCircle01Icon className="h-4 w-4 text-green-500" />
               </div>
               <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{doneToday + doneBoardCardsToday + doneChecklistItemsToday}</p>
                  <p className="text-[8px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">Completed Today</p>
               </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/15 flex items-center justify-center flex-shrink-0">
            <Tick02Icon className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/10 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none hover:-translate-y-1">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-[0.15em]">Active Team</p>
              <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mt-1">{teamMembers.length}</p>
            </div>
            <div className="flex -space-x-2 overflow-hidden">
              {teamMembers.map((member: any) => (
                <div key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-black bg-gray-100 dark:bg-white/10 overflow-hidden flex items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400">{member.name?.[0] ?? "U"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <UserMultipleIcon className="h-5 w-5 text-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

async function ActivitySection({ user }: { user: any }) {
  const { activeTasks, recentActivities, publicHolidays } = await getActivityData(user);
  const { boardCards, checklistItems, cardActivities, workspaceJoins } = await getBoardDashboardData(user);

  const allDeadlineTasks = [
    ...activeTasks.map((t) => ({
      id: t.id,
      title: t.title,
      slaStartedAt: t.slaStartedAt ? t.slaStartedAt.toISOString() : null,
      slaHours: t.slaHours,
      deadlineDate: null as string | null,
    })),
    ...boardCards.map((c) => ({
      id: -(c.id),
      title: c.title,
      slaStartedAt: null,
      slaHours: null,
      deadlineDate: c.dueDate ? c.dueDate.toISOString() : null,
    }))
  ];

  const totalActiveCount = activeTasks.length + boardCards.length + checklistItems.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <DeadlineCalendarClient
          tasks={allDeadlineTasks}
          holidays={publicHolidays.map((h) => ({
            id: h.id,
            name: h.name,
            date: h.date.toISOString(),
          }))}
        />
      </div>

      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-[#111111] shadow-sm dark:shadow-none rounded-3xl border border-gray-100 dark:border-white/10 p-6 overflow-hidden relative flex flex-col" style={{ height: "480px" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fff1f2] flex items-center justify-center">
                <PlayIcon className="h-5 w-5 text-[#c91f41]" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Active Work</h2>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">Tasks, Cards & Checklists</p>
              </div>
            </div>
            {totalActiveCount > 0 && (
               <span className="bg-[#c91f41] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                 {totalActiveCount}
               </span>
            )}
          </div>
          {totalActiveCount > 0 ? (
            <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {activeTasks.map((task) => (
                <a
                  key={`task-${task.id}`}
                  href={`/tasks/${task.id}`}
                  className="group block p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-transparent hover:border-[#c91f41]/10 hover:bg-white dark:hover:bg-white/10 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#c91f41]">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-gray-400">{task.project?.client?.name}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[10px] font-bold text-gray-500">{task.project?.title}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
              {boardCards.map((card) => (
                <a
                  key={`card-${card.id}`}
                  href={`/board?active=b-${card.list.board.id}`}
                  className="group block p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-transparent hover:border-[#c91f41]/10 hover:bg-white dark:hover:bg-white/10 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#c91f41]">
                        {card.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-gray-400">{card.list.board.title}</span>
                        {card.dueDate && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="text-[10px] font-bold text-gray-500">Due {new Date(card.dueDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
              {checklistItems.map((item) => (
                <div
                  key={`checklist-${item.id}`}
                  className="group block p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-transparent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-gray-400">{item.checklist.title}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[10px] font-bold text-gray-500">{item.checklist.card.title}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <TaskDone01Icon className="h-6 w-6 text-gray-300 dark:text-zinc-700" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-zinc-400">No open tasks</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Enjoy the calm of a clear list.</p>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-[#111111] shadow-sm dark:shadow-none rounded-3xl border border-gray-100 dark:border-white/10 p-6" style={{ height: "480px", display: "flex", flexDirection: "column" }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fff1f2] flex items-center justify-center">
                <Clock01Icon className="h-5 w-5 text-[#c91f41]" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Recent Activity</h2>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">Live Updates</p>
              </div>
            </div>
            <form action={clearLatestActivity}>
              <button
                type="submit"
                className="text-[10px] font-black text-gray-400 hover:text-[#c91f41] uppercase tracking-widest transition-colors flex items-center gap-1 group"
              >
                Clear All
              </button>
            </form>
          </div>
          {(recentActivities.length > 0 || cardActivities.length > 0 || workspaceJoins.length > 0) ? (
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {recentActivities.map((activity) => (
                <div key={`act-${activity.id}`} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#c91f41] before:z-10 after:absolute after:left-[2.5px] after:top-3 after:h-[calc(100%+0.5rem)] after:w-px after:bg-gray-100 last:after:hidden">
                  <p className="text-sm text-gray-900 dark:text-white font-bold leading-snug">{formatActivityDescription(activity)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-tighter">{activity.user?.name ?? "Deleted User"}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600">{formatTime(activity.createdAt)}</span>
                  </div>
                </div>
              ))}
              {cardActivities.map((ca) => (
                <div key={`ca-${ca.id}`} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-500 before:z-10 after:absolute after:left-[2.5px] after:top-3 after:h-[calc(100%+0.5rem)] after:w-px after:bg-gray-100 last:after:hidden">
                  <p className="text-sm text-gray-900 dark:text-white font-bold leading-snug">{ca.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-tighter">{ca.actorName}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600">{formatTime(ca.createdAt)}</span>
                  </div>
                </div>
              ))}
              {workspaceJoins.map((wj) => (
                <div key={`wj-${wj.id}`} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-blue-500 before:z-10 after:absolute after:left-[2.5px] after:top-3 after:h-[calc(100%+0.5rem)] after:w-px after:bg-gray-100 last:after:hidden">
                  <p className="text-sm text-gray-900 dark:text-white font-bold leading-snug">{wj.user.name} joined workspace "{wj.workspace.name}"</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-tighter">Workspace</span>
                    <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600">{formatTime(wj.joinedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <Clock01Icon className="h-6 w-6 text-gray-300 dark:text-zinc-700" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-zinc-400">No activity yet</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Activities will appear as they happen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "CEO") {
    return (
      <div className="space-y-6">
        <RealtimeRefresh intervalMs={15000} />
        <Suspense fallback={<DashboardSkeleton />}>
          <CEODashboardSection />
        </Suspense>
      </div>
    );
  }

  if (user.departmentSlug === "human-resources" && user.role !== "ADMIN" && user.role !== "CEO") {
    return (
      <div className="space-y-6">
        <RealtimeRefresh intervalMs={15000} />
        <Suspense fallback={<DashboardSkeleton />}>
          <HRDashboardSection />
        </Suspense>
      </div>
    );
  }

  if (user.departmentSlug === "finance" && user.role !== "ADMIN" && user.role !== "CEO") {
    return (
      <div className="space-y-6">
        <RealtimeRefresh intervalMs={15000} />
        <Suspense fallback={<DashboardSkeleton />}>
          <FinanceDashboardSection />
        </Suspense>
      </div>
    );
  }

  const canCreateTask = user.role === "ADMIN" || user.role === "CEO" || user.role === "MANAGER";

  return (
    <div className="space-y-6">
      <RealtimeRefresh intervalMs={5000} />

      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-150 shadow-sm p-5">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        }
      >
        <StatsSection user={user} canCreateTask={canCreateTask} />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton />}>
        <ActivitySection user={user} />
      </Suspense>
    </div>
  );
}

/* ----- Stat Card ----- */
// Removed previous StatCard as it's now inline for richer content per request

/* ----- Deadline Calendar ----- */
function DeadlineCalendar({
  tasks,
}: {
  tasks: Array<{ id: number; submittedAt: Date | null }>;
}) {
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long" });
  const year = today.getFullYear();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();

  // Calendar starts on Monday
  const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
  let firstDay = new Date(year, currentMonth, 1).getDay();
  // Convert Sunday=0 to Monday-based: Mon=0, Tue=1 ... Sun=6
  firstDay = firstDay === 0 ? 6 : firstDay - 1;

  const blanks = Array.from({ length: firstDay }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allDays = [...blanks, ...days];

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  // Get task deadlines for this month
  const taskDates = new Set<number>();
  tasks.forEach((task) => {
    if (task.submittedAt) {
      const taskDate = new Date(task.submittedAt);
      if (
        taskDate.getMonth() === currentMonth &&
        taskDate.getFullYear() === year
      ) {
        taskDates.add(taskDate.getDate());
      }
    }
  });

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-black text-gray-900 tracking-tight">Deadlines</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            {month} {year}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#c91f41] hover:bg-[#fff1f2] transition-all">
            <ArrowLeft01Icon className="h-4 w-4" />
          </button>
          <button className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#c91f41] hover:bg-[#fff1f2] transition-all">
            <ArrowRight01Icon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((day, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-black text-gray-300 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day, idx) => (
          <div key={idx} className="aspect-square flex flex-col items-center justify-center relative">
            {day ? (
              <button
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all relative z-10",
                  day === currentDay
                    ? "bg-[#c91f41] text-white shadow-md shadow-[#c91f41]/20"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {day}
                {taskDates.has(day) && (
                  <span className={cn(
                    "absolute bottom-1 w-1 h-1 rounded-full",
                    day === currentDay ? "bg-white" : "bg-[#c91f41]"
                  )} />
                )}
              </button>
            ) : (
              <div className="w-7 h-7" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----- Helper function ----- */
function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString();
}

