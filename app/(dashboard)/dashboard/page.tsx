import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ClipboardIcon,
  Tick02Icon,
  UserMultipleIcon,
  PlayIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  TaskDone01Icon,
  Add01Icon,
  CheckmarkCircle01Icon,
  Calendar01Icon,
  Message01Icon,
  Settings02Icon,
  ShoppingBasket01Icon,
  BitcoinIcon,
  HelpCircleIcon,
} from "@hugeicons/react";
import { DashboardSkeleton, ListSkeleton } from "@/components/skeletons";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import DeadlineCalendarClient from "./DeadlineCalendarClient";
import { getLeaveDurationLabel, getLeaveTypeLabel } from "@/lib/leave";
import CompanyPulse from "@/components/CompanyPulse";
import { getCompanyPulse } from "@/app/actions/pulseActions";

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
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    employeesOnPremise,
    employeesOutOfOffice,
    activeClients,
    newClientsThisMonth,
    activeProjects,
    pendingTasks,
    inProgressTasks,
    doneTasksThisWeek,
    doneToday,
    overdueTasks,
    pendingRequisitions,
    pendingRequisitionTotal,
    recentRefunds,
    pendingLeaves,
    employeesOnLeave,
    leavesOnLeaveToday,
    departments,
    tasksPerDepartment,
    recentActivity,
    itTickets,
    projects,
    criticalTasks,
  ] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.leave.count({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),
    db.client.count({ where: { projects: { some: {} } } }),
    db.client.count({ where: { createdAt: { gte: monthStart } } }),
    db.project.count({ where: { status: "ACTIVE" } }),
    db.task.count({ where: { status: { in: ["UNASSIGNED", "ASSIGNED", "CONFIRMED"] } } }),
    db.task.count({ where: { status: "IN_PROGRESS" } }),
    db.task.count({ where: { status: "DONE", updatedAt: { gte: weekAgo } } }),
    db.task.count({ where: { status: "DONE", updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } }),
    db.task.count({
      where: {
        status: { notIn: ["DONE", "CANCELLED"] },
        submittedAt: { lt: weekAgo },
      },
    }),
    db.requisition.count({ where: { status: { in: ["PENDING_MANAGER", "PENDING_FINANCE"] } } }),
    db.requisition.aggregate({
      where: { status: { in: ["PENDING_MANAGER", "PENDING_FINANCE"] } },
      _sum: { totalAmount: true },
    }),
    db.refund.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.leave.count({ where: { status: { in: ["PENDING", "PENDING_HR"] } } }),
    db.leave.count({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),
    db.leave.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { user: { include: { department: true } } },
      take: 5,
    }),
    db.department.findMany({ select: { id: true, name: true, slug: true } }),
    db.task.groupBy({
      by: ["deptId"],
      where: { status: { notIn: ["DONE", "CANCELLED"] } },
      _count: true,
    }),
    db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.iTTicket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    db.project.findMany({
      where: { status: "ACTIVE" },
      include: { tasks: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
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
  ]);

  const totalPendingSpend = pendingRequisitionTotal._sum.totalAmount ?? 0;

  const departmentMap = new Map(departments.map((d) => [d.id, d.name]));
  const maxDeptTasks = Math.max(1, ...tasksPerDepartment.map((d) => d._count));
  const deptWorkload = departments
    .map((dept) => {
      const entry = tasksPerDepartment.find((d) => d.deptId === dept.id);
      return {
        name: dept.name.toUpperCase(),
        count: entry?._count ?? 0,
        pct: Math.round(((entry?._count ?? 0) / maxDeptTasks) * 100),
      };
    })
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
          pct,
          breached,
        };
      }

      return null;
    })
    .filter((item): item is { id: number; region: string; title: string; note: string; pct: number; breached: boolean } => Boolean(item))
    .slice(0, 3);

  const projectHealth = projects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    return {
      id: p.id,
      name: p.title,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  return {
    employeesOnPremise,
    employeesOutOfOffice,
    activeClients,
    newClientsThisMonth,
    activeProjects,
    pendingTasks,
    inProgressTasks,
    doneTasksThisWeek,
    doneToday,
    overdueTasks,
    pendingRequisitions,
    totalPendingSpend,
    recentRefunds,
    pendingLeaves,
    employeesOnLeave,
    leavesOnLeaveToday,
    deptWorkload,
    criticalSlas,
    recentActivity,
    itTickets,
    projectHealth,
  };
}

async function CEODashboardSection() {
  const data = await getCEODashboardData();

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <section>
        <h1 className="text-[44px] leading-none font-black tracking-tight text-[#111f34] dark:text-white">
          Executive <span className="text-[#c91f41]">Dashboard</span>
        </h1>
      </section>

      {/* 1. Top Stats Row */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-5 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col gap-1">
          <UserMultipleIcon className="w-6 h-6 text-[#c91f41] mb-2" />
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Attendance</p>
          <h3 className="text-2xl font-extrabold text-[#111f34] dark:text-white">
            {data.employeesOnPremise.toLocaleString()}{" "}
            <span className="text-xs font-medium text-[#005a4d]">/ {data.employeesOutOfOffice}</span>
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">On Premise / Out</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col gap-1">
          <BitcoinIcon className="w-6 h-6 text-[#005a4d] mb-2" />
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Active Clients</p>
          <h3 className="text-2xl font-extrabold text-[#111f34] dark:text-white">{data.activeClients}</h3>
          <p className="text-[10px] text-[#005a4d] font-medium">+{data.newClientsThisMonth} this month</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col gap-1">
          <ClipboardIcon className="w-6 h-6 text-[#c91f41] mb-2" />
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Projects</p>
          <h3 className="text-2xl font-extrabold text-[#111f34] dark:text-white">{data.activeProjects}</h3>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Ongoing initiatives</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col gap-1">
          <TaskDone01Icon className="w-6 h-6 text-[#a3002d] mb-2" />
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Pending Tasks</p>
          <h3 className="text-2xl font-extrabold text-[#111f34] dark:text-white">{data.pendingTasks}</h3>
          <p className="text-[10px] text-red-500 font-medium">{data.overdueTasks} overdue</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col gap-1">
          <ShoppingBasket01Icon className="w-6 h-6 text-[#c91f41] mb-2" />
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Requisitions</p>
          <h3 className="text-2xl font-extrabold text-[#111f34] dark:text-white">
            {data.pendingRequisitions}{" "}
            <span className="text-sm font-semibold text-[#a3002d]">
              KES {(data.totalPendingSpend / 1000).toFixed(1)}k
            </span>
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Awaiting approval</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col gap-1">
          <Calendar01Icon className="w-6 h-6 text-[#005a4d] mb-2" />
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Leave Requests</p>
          <h3 className="text-2xl font-extrabold text-[#111f34] dark:text-white">{data.pendingLeaves}</h3>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">New submissions</p>
        </div>
      </section>

      {/* 2. Operations Overview & Project Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Operations */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-[#111f34] dark:text-white tracking-tight">Operations Overview</h2>
            <Link href="/tasks" className="text-xs font-bold text-[#c91f41] uppercase tracking-widest flex items-center gap-1 hover:underline">
              Full Report <ArrowRight01Icon className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task Velocity */}
            <div className="p-6 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-4">Task Velocity</p>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111f34] dark:text-white">Done This Week</span>
                    <span className="text-xs font-bold text-[#005a4d]">{data.doneTasksThisWeek}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#005a4d] rounded-full" style={{ width: `${Math.min(100, Math.round((data.doneTasksThisWeek / Math.max(1, data.doneTasksThisWeek + data.inProgressTasks + data.pendingTasks)) * 100))}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111f34] dark:text-white">In Progress</span>
                    <span className="text-xs font-bold text-[#c91f41]">{data.inProgressTasks}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#c91f41] rounded-full" style={{ width: `${Math.min(100, Math.round((data.inProgressTasks / Math.max(1, data.doneTasksThisWeek + data.inProgressTasks + data.pendingTasks)) * 100))}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111f34] dark:text-white">Pending Review</span>
                    <span className="text-xs font-bold text-[#a3002d]">{data.pendingTasks}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#a3002d] rounded-full" style={{ width: `${Math.min(100, Math.round((data.pendingTasks / Math.max(1, data.doneTasksThisWeek + data.inProgressTasks + data.pendingTasks)) * 100))}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Department Workload */}
            <div className="p-6 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-4">Dept Workload Distribution</p>
              <div className="space-y-3">
                {data.deptWorkload.map((dept) => (
                  <div key={dept.name} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold w-20 text-gray-400 dark:text-zinc-500 truncate">{dept.name}</span>
                    <div className="flex-1 h-3 bg-gray-100 dark:bg-white/10 rounded-sm overflow-hidden">
                      <div className="h-full bg-[#c91f41] rounded-sm" style={{ width: `${dept.pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-[#111f34] dark:text-white w-8 text-right">{dept.pct}%</span>
                  </div>
                ))}
                {data.deptWorkload.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-4">No active department tasks</p>
                )}
              </div>
            </div>
          </div>

          {/* Critical SLAs */}
          <div className="p-6 bg-white dark:bg-[#111111] rounded-2xl border-l-4 border-l-[#c91f41] border border-gray-100 dark:border-white/10 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[#111f34] dark:text-white">Critical System SLAs</h3>
              {data.criticalSlas.length > 0 && (
                <span className="px-2 py-0.5 bg-[#c91f41]/10 text-[#c91f41] text-[10px] font-bold rounded uppercase">Action Required</span>
              )}
            </div>
            {data.criticalSlas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.criticalSlas.map((sla) => (
                  <div key={sla.id} className="flex flex-col gap-2">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="truncate">{sla.title}</span>
                      <span className={sla.breached ? "text-red-500" : "text-[#005a4d]"}>{sla.region}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${sla.breached ? "bg-red-500" : "bg-[#c91f41]"}`} style={{ width: `${Math.min(100, sla.pct)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">{sla.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>All Systems Operational</span>
                  <span className="text-[#005a4d]">Normal</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#005a4d] rounded-full" style={{ width: "100%" }} />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">All tracked work is within acceptable SLA thresholds.</p>
              </div>
            )}
          </div>
        </div>

        {/* Project Health */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <h2 className="text-xl font-extrabold text-[#111f34] dark:text-white tracking-tight">Project Health</h2>
          <div className="flex flex-col bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6 gap-6">
            <div className="space-y-4">
              {data.projectHealth.map((project) => (
                <div key={project.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-[#111f34] dark:text-white truncate">{project.name}</span>
                    <span className="text-xs font-bold text-gray-400 dark:text-zinc-500">{project.pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#c91f41] rounded-full" style={{ width: `${project.pct}%` }} />
                  </div>
                </div>
              ))}
              {data.projectHealth.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-4">No active projects</p>
              )}
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-white/10">
              <Link href="/projects" className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-4 hover:text-[#c91f41] transition-colors block">
                View All Projects →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Financial Summary */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[#111f34] dark:text-white tracking-tight">Financial Summary</h2>
          <div className="px-6 py-2 bg-[#c91f41] text-white rounded-xl shadow-lg flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Total Pending Spend</span>
            <span className="text-xl font-extrabold">KES {data.totalPendingSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-sm font-bold text-[#111f34] dark:text-white">High Priority Requisitions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Request ID</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {/* We fetch pending requisitions inline for CEO */}
                  <RequisitionTableRows />
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-sm font-bold text-[#111f34] dark:text-white">Recent Refunds</h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {data.recentRefunds.length > 0 ? data.recentRefunds.map((refund) => (
                <div key={refund.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-bold text-[#111f34] dark:text-white">#RF-{refund.id}</p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">{refund.user.name}</p>
                  </div>
                  <span className="text-sm font-extrabold text-red-500">
                    -KES {refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )) : (
                <div className="px-6 py-6 text-center">
                  <p className="text-xs text-gray-400 dark:text-zinc-500">No recent refunds</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10">
              <Link href="/finance/refunds" className="text-[10px] font-bold text-[#c91f41] uppercase tracking-widest hover:underline">
                View All Refunds →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HR Snapshot & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* HR Snapshot */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <h2 className="text-xl font-extrabold text-[#111f34] dark:text-white tracking-tight">HR Snapshot</h2>
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">On Leave Today</p>
              <span className="text-lg font-extrabold text-[#111f34] dark:text-white">{data.employeesOnLeave}</span>
            </div>
            <div className="space-y-3">
              {data.leavesOnLeaveToday.length > 0 ? data.leavesOnLeaveToday.map((leave) => (
                <div key={leave.id} className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-[#c91f41]/10 flex items-center justify-center text-[10px] font-bold text-[#c91f41]">
                    {leave.user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#111f34] dark:text-white">{leave.user.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">{leave.user.department?.name || "Unassigned"} • {getLeaveTypeLabel(leave.type)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-4">No employees on leave today</p>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/10">
              <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Pending Leave Requests</p>
              <div className="flex flex-col gap-2">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#111f34] dark:text-white">{data.pendingLeaves} New Submissions</span>
                  <Link href="/hr/leaves" className="text-[10px] font-bold text-[#c91f41] px-3 py-1 bg-white dark:bg-[#111111] rounded-lg shadow-sm hover:underline">
                    Review All
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <h2 className="text-xl font-extrabold text-[#111f34] dark:text-white tracking-tight">Executive Activity Feed</h2>
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar">
              <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gray-200 dark:before:bg-white/10">
                {data.recentActivity.length > 0 ? data.recentActivity.map((activity, idx) => {
                  const colors = ["bg-[#c91f41]", "bg-[#005a4d]", "bg-[#a3002d]", "bg-[#c91f41]/20"];
                  const color = colors[idx % colors.length];
                  const isLight = idx % colors.length === 3;
                  return (
                    <div key={activity.id} className="flex gap-4 relative">
                      <div className={`size-6 rounded-full ${color} border-4 border-white dark:border-[#111111] z-10 flex items-center justify-center`}>
                        <span className={`w-3 h-3 ${isLight ? "text-[#c91f41]" : "text-white"}`}><PlayIcon className="w-3 h-3" /></span>
                      </div>
                      <div className="flex-1 -mt-0.5">
                        <p className="text-xs text-[#111f34] dark:text-white leading-relaxed">
                          {activity.description}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">{formatTimeAgo(activity.createdAt)}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-8">No recent activity</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#a3002d] text-lg"><HelpCircleIcon className="w-5 h-5" /></span>
                <span className="text-xs font-bold text-[#111f34] dark:text-white">{data.itTickets} Open IT Tickets</span>
              </div>
              <Link href="/it-support" className="text-[10px] font-bold text-[#c91f41] uppercase tracking-widest hover:underline">
                View All Activity
              </Link>
            </div>
          </div>
        </div>
      </div>
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

async function RequisitionTableRows() {
  const requisitions = await db.requisition.findMany({
    include: { user: { include: { department: true } } },
    where: { status: { in: ["PENDING_MANAGER", "PENDING_FINANCE"] } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (requisitions.length === 0) {
    return (
      <tr>
        <td colSpan={4} className="px-6 py-6 text-center text-xs text-gray-400 dark:text-zinc-500">
          No pending requisitions
        </td>
      </tr>
    );
  }

  return (
    <>
      {requisitions.map((req) => {
        const flow = getRequisitionFlow(req.status);
        return (
          <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
            <td className="px-6 py-4 text-xs font-bold text-[#c91f41]">#RQ-{req.id}</td>
            <td className="px-6 py-4 text-xs text-[#111f34] dark:text-white">{req.user.department?.name || "Operations"}</td>
            <td className="px-6 py-4 text-xs font-bold text-[#111f34] dark:text-white">
              KES {req.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="px-6 py-4">
              <span className={cn("inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]", flow.text)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", flow.dot)} />
                {flow.label}
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
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
  let pulseFeed: any[] = [];
  try {
    pulseFeed = await getCompanyPulse();
  } catch (e) {
    console.error("Failed to load company pulse:", e);
  }

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
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-[#111111] shadow-sm dark:shadow-none rounded-3xl border border-gray-100 dark:border-white/10 p-6 overflow-hidden relative flex flex-col" style={{ height: "480px" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fff1f2] flex items-center justify-center">
                <PlayIcon className="h-5 w-5 text-[#c91f41]" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Tasks at a Glance</h2>
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
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {(() => {
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const todayEnd = new Date(todayStart.getTime() + 86400000);
                const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);

                type GlanceItem = {
                  key: string;
                  href: string | null;
                  title: string;
                  subtitle: string;
                  deadline: Date | null;
                  status: "ACTIVE" | "WAITING" | "CRITICAL" | "PENDING";
                  sortDate: number;
                };

                const items: GlanceItem[] = [];

                for (const task of activeTasks) {
                  const due = task.slaStartedAt ? new Date(task.slaStartedAt.getTime() + (task.slaHours ?? 0) * 3600000) : null;
                  let status: GlanceItem["status"] = "PENDING";
                  if (due) {
                    if (due < todayEnd) status = "CRITICAL";
                    else if (due < weekEnd) status = "ACTIVE";
                    else status = "WAITING";
                  }
                  items.push({
                    key: `task-${task.id}`,
                    href: `/tasks/${task.id}`,
                    title: task.title,
                    subtitle: [task.project?.client?.name, task.project?.title].filter(Boolean).join(" · "),
                    deadline: due,
                    status,
                    sortDate: due ? due.getTime() : Number.MAX_SAFE_INTEGER,
                  });
                }

                for (const card of boardCards) {
                  const due = card.dueDate ? new Date(card.dueDate) : null;
                  let status: GlanceItem["status"] = "PENDING";
                  if (due) {
                    if (due < todayEnd) status = "CRITICAL";
                    else if (due < weekEnd) status = "ACTIVE";
                    else status = "WAITING";
                  }
                  items.push({
                    key: `card-${card.id}`,
                    href: `/board?active=b-${card.list.board.id}`,
                    title: card.title,
                    subtitle: card.list.board.title,
                    deadline: due,
                    status,
                    sortDate: due ? due.getTime() : Number.MAX_SAFE_INTEGER,
                  });
                }

                for (const item of checklistItems) {
                  items.push({
                    key: `checklist-${item.id}`,
                    href: null,
                    title: item.title,
                    subtitle: [item.checklist.title, item.checklist.card.title].filter(Boolean).join(" · "),
                    deadline: null,
                    status: "PENDING",
                    sortDate: Number.MAX_SAFE_INTEGER,
                  });
                }

                items.sort((a, b) => a.sortDate - b.sortDate);

                function formatDateLabel(d: Date | null): string {
                  if (!d) return "OPEN";
                  if (d >= todayStart && d < todayEnd) return "TODAY";
                  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
                  return `${months[d.getMonth()]} ${d.getDate()}`;
                }

                function getStatusStyle(s: GlanceItem["status"]): string {
                  switch (s) {
                    case "ACTIVE": return "bg-emerald-50 text-emerald-600";
                    case "WAITING": return "bg-blue-50 text-blue-600";
                    case "CRITICAL": return "bg-red-50 text-red-600";
                    case "PENDING": return "bg-gray-100 text-gray-500";
                  }
                }

                function getStatusDot(s: GlanceItem["status"]): string {
                  switch (s) {
                    case "ACTIVE": return "bg-emerald-500";
                    case "WAITING": return "bg-blue-500";
                    case "CRITICAL": return "bg-red-500";
                    case "PENDING": return "bg-gray-400";
                  }
                }

                return items.map((item) => {
                  const row = (
                    <div key={item.key} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div className="w-14 flex-shrink-0 text-center">
                        <span className="text-[10px] font-black text-gray-400 dark:text-zinc-600 uppercase tracking-widest">{formatDateLabel(item.deadline)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 truncate uppercase tracking-wider mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0 ${getStatusStyle(item.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(item.status)}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{item.status}</span>
                      </div>
                    </div>
                  );
                  return item.href ? (
                    <a key={item.key} href={item.href} className="block">
                      {row}
                    </a>
                  ) : row;
                });
              })()}
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

      <div className="lg:col-span-4">
        <CompanyPulse initialFeed={pulseFeed} currentUserId={user.id} />
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

