"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckListIcon,
  Add01Icon,
  Search01Icon,
  Clock01Icon,
  Tick01Icon,
  CancelCircleIcon,
} from "@hugeicons/react";

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
  userRole?: string;
  userDepartmentSlug?: string | null;
}

function calculateDueDate(task: TaskItem): Date | null {
  if (!task.slaHours || !task.slaStartedAt) return null;
  const started = new Date(task.slaStartedAt).getTime();
  const totalMs = task.slaHours * 60 * 60 * 1000;
  const pausedMs = (task.slaPausedDuration || 0) * 1000;
  return new Date(started + totalMs - pausedMs);
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

export default function TasksClient({ initialTasks, canCreate, userRole, userDepartmentSlug }: Props) {
  const router = useRouter();
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ARCHIVE">("ACTIVE");
  const [dueFilter, setDueFilter] = useState<"ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH">("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [itemsDisplayed, setItemsDisplayed] = useState(10);

  const shouldShowDepartmentFilter =
    userRole === "ADMIN" ||
    userRole === "CEO" ||
    userDepartmentSlug === "client-service" ||
    userDepartmentSlug === "business-development";

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setItemsDisplayed(10);
  }, [search, statusFilter, priorityFilter, activeTab, dueFilter, departmentFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 10000);

    return () => clearInterval(interval);
  }, [router]);

  const statuses = useMemo(
    () => ["ALL", ...Array.from(new Set(tasks.map((task) => task.status)))],
    [tasks]
  );

  const priorities = useMemo(
    () => ["ALL", ...Array.from(new Set(tasks.map((task) => task.priority)))],
    [tasks]
  );

  const departments = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.departmentName).filter(Boolean as any as (d: any) => d is string))),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return tasks
      .filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
        t.clientName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
      const isArchived = t.status === "DONE" || t.status === "CANCELLED";
      const matchesTab = activeTab === "ACTIVE" ? !isArchived : isArchived;
      
      const matchesDepartment = departmentFilter === "ALL" || t.departmentName === departmentFilter;

      const matchesDueDate = (() => {
        if (dueFilter === "ALL") return true;
        const dueDate = calculateDueDate(t);
        if (!dueDate) return true;
        
        if (dueFilter === "TODAY") {
          return dueDate >= startOfToday && dueDate < endOfToday;
        }
        if (dueFilter === "THIS_WEEK") {
          return dueDate >= startOfWeek && dueDate < endOfWeek;
        }
        if (dueFilter === "THIS_MONTH") {
          return dueDate >= startOfMonth && dueDate < endOfMonth;
        }
        return true;
      })();
      
        return matchesSearch && matchesStatus && matchesPriority && matchesTab && matchesDepartment && matchesDueDate;
      })
      .sort((left, right) => {
        const leftDue = calculateDueDate(left)?.getTime() ?? Number.POSITIVE_INFINITY;
        const rightDue = calculateDueDate(right)?.getTime() ?? Number.POSITIVE_INFINITY;
        if (leftDue !== rightDue) return leftDue - rightDue;
        return left.id - right.id;
      });
  }, [tasks, search, statusFilter, priorityFilter, activeTab, dueFilter, departmentFilter]);

  const displayedTasks = filteredTasks.slice(0, itemsDisplayed);
  const hasMore = itemsDisplayed < filteredTasks.length;

  const handleTableScroll = () => {
    const el = tableScrollRef.current;
    if (!el || !hasMore) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 64;
    if (nearBottom) {
      setItemsDisplayed((prev) => Math.min(prev + 10, filteredTasks.length));
    }
  };

  const statusPill: Record<string, string> = {
    UNASSIGNED: "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400",
    ASSIGNED: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
    CONFIRMED: "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    IN_PROGRESS: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    PAUSED: "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300",
    SUBMITTED: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300",
    REVISION: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300",
    DONE: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    CANCELLED: "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400",
  };

  const priorityText: Record<string, string> = {
    LOW: "text-gray-500 dark:text-zinc-500",
    MEDIUM: "text-slate-500 dark:text-zinc-400",
    HIGH: "text-orange-600 dark:text-orange-300",
    URGENT: "text-red-600 dark:text-red-300",
  };

  const pendingCount = tasks.filter((t) => !["DONE", "CANCELLED"].includes(t.status)).length;
  const inProgressCount = tasks.filter((t) => ["CONFIRMED", "IN_PROGRESS", "PAUSED"].includes(t.status)).length;
  const completedCount = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 rounded-3xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10 p-7">
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Pipeline Velocity</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-2 leading-relaxed max-w-md">
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

      <section className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111111] overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-2xl bg-gray-100 dark:bg-white/10 p-1 w-fit">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition ${
                activeTab === "ACTIVE"
                  ? "bg-[#ffe8ec] text-[#c91f41]"
                      : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"
              }`}
            >
              Active Tasks
            </button>
            <button
              onClick={() => setActiveTab("ARCHIVE")}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition ${
                activeTab === "ARCHIVE"
                  ? "bg-[#ffe8ec] text-[#c91f41]"
                      : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"
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
                className="h-9 w-56 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black pl-9 pr-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ffd8e0]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 min-w-[132px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black pl-4 pr-10 text-xs font-semibold text-gray-600 dark:text-zinc-400"
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
              className="h-9 min-w-[132px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black pl-4 pr-10 text-xs font-semibold text-gray-600 dark:text-zinc-400"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p === "ALL" ? "All Priority" : p}
                </option>
              ))}
            </select>

            {shouldShowDepartmentFilter && (
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setItemsDisplayed(10);
                }}
                className="h-9 min-w-[140px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black pl-4 pr-10 text-xs font-semibold text-gray-600 dark:text-zinc-400"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="px-6 pt-3 pb-5 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-600 mr-1">Due</span>
          {(["ALL", "TODAY", "THIS_WEEK", "THIS_MONTH"] as const).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDueFilter(d);
                setItemsDisplayed(10);
              }}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                dueFilter === d
                  ? "bg-[#ffe8ec] text-[#c91f41] border border-[#ffd8e0]"
                  : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-zinc-500 border border-gray-100 dark:border-white/10 hover:text-[#c91f41] hover:border-[#ffd8e0]"
              }`}
            >
              {d === "ALL" ? "All" : d === "THIS_WEEK" ? "This week" : d === "THIS_MONTH" ? "This month" : "Today"}
            </button>
          ))}
        </div>

        <div
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="overflow-x-auto flex-1 max-h-[700px] overflow-y-auto"
        >
          {displayedTasks.length > 0 ? (
            <table className="w-full min-w-[860px]">
              <thead className="sticky top-0 bg-white dark:bg-[#111111] z-10">
                <tr className="text-left text-[10px] text-gray-400 dark:text-zinc-600 font-black tracking-[0.16em] uppercase border-b border-gray-100 dark:border-white/10">
                  <th className="px-6 py-3">Task Name</th>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Assignee</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">SLA / Priority</th>
                </tr>
              </thead>
              <tbody>
                {displayedTasks.map((task) => {
                  const sla = calculateSLA(task);
                  return (
                    <tr key={task.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <Link href={`/tasks/${task.id}`} className="group">
                          <div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#c91f41] transition-colors leading-tight">
                                {task.title}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-zinc-600 font-semibold uppercase tracking-wider mt-1">
                                ID: OPS-{task.id}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <Link
                          href={`/projects/${task.projectId}`}
                          className="inline-block text-xs font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-white/10 rounded-lg px-2 py-1 hover:text-[#c91f41] transition-colors"
                        >
                          {task.projectTitle}
                        </Link>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-600 font-semibold mt-1">{task.clientName}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {task.assigneeName ? (
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-[#ffe8ec] text-[#c91f41] text-xs font-bold flex items-center justify-center">
                              {task.assigneeName[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-700 dark:text-zinc-300 font-medium">{task.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-zinc-600">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${statusPill[task.status] || "bg-gray-100 text-gray-600"}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {sla.status === "not_started" ? (
                          <p className="text-xs font-bold text-gray-400 dark:text-zinc-600">Not started</p>
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
                          <span className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400 font-bold">
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
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <CheckListIcon className="h-8 w-8 text-gray-400 dark:text-zinc-600" />
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">No tasks found</p>
              <p className="text-sm text-gray-500 dark:text-zinc-500 mt-2">
                {activeTab === "ACTIVE"
                  ? "No active tasks match this filter"
                  : "No archived tasks match this filter"}
              </p>
            </div>
          )}
        </div>

        {hasMore && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex justify-center">
            <button
              onClick={() => setItemsDisplayed((prev) => prev + 10)}
              className="px-6 py-2.5 bg-[#c91f41] hover:bg-[#a81a36] text-white font-bold text-sm rounded-xl transition-all active:scale-95"
            >
              Load More ({itemsDisplayed} of {filteredTasks.length})
            </button>
          </div>
        )}
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
    <div className={`rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10 border-l-2 p-5 ${accentStyles[accent]}`}>
      <p className="text-[10px] font-black text-gray-400 dark:text-zinc-600 uppercase tracking-[0.2em]">{label}</p>
      <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mt-2">{value}</p>
      <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 mt-1">{note}</p>
    </div>
  );
}

