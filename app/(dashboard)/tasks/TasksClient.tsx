"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckListIcon,
  Add01Icon,
  Search01Icon,
  FilterIcon,
  Clock01Icon,
  Tick01Icon,
  CancelCircleIcon,
} from "hugeicons-react";

type TaskItem = {
  id: number;
  title: string;
  status: string;
  priority: string;
  projectId: number;
  projectTitle: string;
  clientName: string;
  departmentName: string | null;
  assigneeName: string | null;
  creatorName: string;
  slaHours: number | null;
  slaStartedAt: string | null;
  slaPausedAt: string | null;
  slaPausedDuration: number | null;
  createdAt: string;
};

interface Props {
  initialTasks: TaskItem[];
  canCreate: boolean;
}

function calculateSLA(task: TaskItem) {
  if (!task.slaHours || !task.slaStartedAt) {
    return { status: "not_started", remaining: null, percentage: 0 };
  }

  if (task.status === "DONE" || task.status === "CANCELLED") {
    return { status: "completed", remaining: null, percentage: 100 };
  }

  const now = new Date().getTime();
  const started = new Date(task.slaStartedAt).getTime();
  const totalMs = task.slaHours * 60 * 60 * 1000;
  const pausedMs = (task.slaPausedDuration || 0) * 1000;

  let elapsed = now - started - pausedMs;

  if (task.slaPausedAt) {
    elapsed = new Date(task.slaPausedAt).getTime() - started - pausedMs;
  }

  const remaining = totalMs - elapsed;
  const percentage = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));

  if (remaining <= 0) {
    return { status: "breached", remaining: 0, percentage: 100 };
  }

  if (percentage >= 75) {
    return { status: "warning", remaining, percentage };
  }

  return { status: "on_track", remaining, percentage };
}

function formatRemaining(ms: number | null) {
  if (ms === null) return "";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export default function TasksClient({ initialTasks, canCreate }: Props) {
  const [tasks] = useState<TaskItem[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ARCHIVE">("ACTIVE");

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
        t.clientName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
      const isArchived = t.status === "DONE" || t.status === "CANCELLED";
      const matchesTab = activeTab === "ACTIVE" ? !isArchived : isArchived;
      return matchesSearch && matchesStatus && matchesPriority && matchesTab;
    });
  }, [tasks, search, statusFilter, priorityFilter, activeTab]);

  const statusPill: Record<string, string> = {
    UNASSIGNED: "bg-gray-100 text-gray-600",
    ASSIGNED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-indigo-100 text-indigo-700",
    IN_PROGRESS: "bg-emerald-100 text-emerald-700",
    PAUSED: "bg-orange-100 text-orange-700",
    SUBMITTED: "bg-violet-100 text-violet-700",
    REVISION: "bg-rose-100 text-rose-700",
    DONE: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-gray-100 text-gray-600",
  };

  const priorityText: Record<string, string> = {
    LOW: "text-gray-500",
    MEDIUM: "text-slate-500",
    HIGH: "text-orange-600",
    URGENT: "text-red-600",
  };

  const statuses = ["ALL", "UNASSIGNED", "ASSIGNED", "CONFIRMED", "IN_PROGRESS", "PAUSED", "SUBMITTED", "REVISION", "DONE", "CANCELLED"];
  const priorities = ["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"];

  const pendingCount = tasks.filter((t) => !["DONE", "CANCELLED"].includes(t.status)).length;
  const inProgressCount = tasks.filter((t) => ["IN_PROGRESS", "PAUSED"].includes(t.status)).length;
  const completedCount = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 rounded-3xl bg-white border border-gray-100 p-7">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Pipeline Velocity</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-md">
            A curated view of active operational tasks. Priorities are weighted by SLA proximity.
          </p>
          {canCreate && (
            <Link
              href="/tasks/new"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-[#c91f41] text-white text-sm font-bold hover:bg-[#a81a36] transition-colors shadow-sm"
            >
              <Add01Icon className="h-4 w-4" />
              Create New Task
            </Link>
          )}
        </div>

        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Pending" value={pendingCount} note="Action queue" accent="rose" />
          <MetricCard label="In Progress" value={inProgressCount} note="Active now" accent="teal" />
          <MetricCard label="Completed" value={completedCount} note="Delivery target achieved" accent="indigo" />
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-2xl bg-gray-100 p-1 w-fit">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition ${
                activeTab === "ACTIVE"
                  ? "bg-[#ffe8ec] text-[#c91f41]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Active Tasks
            </button>
            <button
              onClick={() => setActiveTab("ARCHIVE")}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition ${
                activeTab === "ARCHIVE"
                  ? "bg-[#ffe8ec] text-[#c91f41]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Archive
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search task or client"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#ffd8e0]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-600"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All Status" : s.replace("_", " ")}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-600"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p === "ALL" ? "All Priority" : p}
                </option>
              ))}
            </select>

            <button className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#c91f41] hover:border-[#ffd8e0]">
              <FilterIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredTasks.length > 0 ? (
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="text-left text-[10px] text-gray-400 font-black tracking-[0.16em] uppercase border-b border-gray-100">
                  <th className="px-6 py-3">Task Name</th>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Assignee</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">SLA / Priority</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const sla = calculateSLA(task);
                  return (
                    <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <Link href={`/tasks/${task.id}`} className="group">
                          <div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 group-hover:text-[#c91f41] transition-colors leading-tight">
                                {task.title}
                              </p>
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-1">
                                ID: OPS-{task.id}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <Link
                          href={`/projects/${task.projectId}`}
                          className="inline-block text-xs font-bold text-slate-600 bg-slate-100 rounded-lg px-2 py-1 hover:text-[#c91f41] transition-colors"
                        >
                          {task.projectTitle}
                        </Link>
                        <p className="text-[10px] text-gray-400 font-semibold mt-1">{task.clientName}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {task.assigneeName ? (
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-[#ffe8ec] text-[#c91f41] text-xs font-bold flex items-center justify-center">
                              {task.assigneeName[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-700 font-medium">{task.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${statusPill[task.status] || "bg-gray-100 text-gray-600"}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {sla.status === "not_started" ? (
                          <p className="text-xs font-bold text-gray-400">Not started</p>
                        ) : sla.status === "completed" ? (
                          <span className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                            <Tick01Icon className="h-4 w-4 flex-shrink-0" />
                            Complete
                          </span>
                        ) : sla.status === "breached" ? (
                          <span className="flex items-center gap-2 text-xs text-red-600 font-bold">
                            <CancelCircleIcon className="h-4 w-4 flex-shrink-0" />
                            Breached
                          </span>
                        ) : sla.status === "warning" ? (
                          <span className="flex items-center gap-2 text-xs text-orange-600 font-bold">
                            <Clock01Icon className="h-4 w-4 flex-shrink-0" />
                            {formatRemaining(sla.remaining)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                            <Clock01Icon className="h-4 w-4 flex-shrink-0" />
                            {formatRemaining(sla.remaining)}
                          </span>
                        )}

                        <p className={`text-[10px] font-bold mt-1 ${priorityText[task.priority] || "text-gray-500"}`}>
                          {task.priority}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <CheckListIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-base font-semibold text-gray-900">No tasks found</p>
              <p className="text-sm text-gray-500 mt-2">
                {activeTab === "ACTIVE"
                  ? "No active tasks match this filter"
                  : "No archived tasks match this filter"}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: number;
  note: string;
  accent: "rose" | "teal" | "indigo";
}) {
  const accentStyles = {
    rose: "border-l-[#c91f41]",
    teal: "border-l-teal-500",
    indigo: "border-l-indigo-300",
  };

  return (
    <div className={`rounded-2xl bg-white border border-gray-100 border-l-2 p-5 ${accentStyles[accent]}`}>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</p>
      <p className="text-4xl font-black text-slate-800 tracking-tight mt-2">{value}</p>
      <p className="text-[10px] font-bold text-gray-400 mt-1">{note}</p>
    </div>
  );
}

