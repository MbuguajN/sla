"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDepartmentToProject, addProjectBriefLink, closeProject, deleteProjectBriefLink, pauseProject, resumeProject } from "@/app/actions/projectActions";
import { cn } from "@/lib/utils";
import { Download, Filter, Plus, Search, X, CheckCircle, PauseCircle, PlayCircle, Link2, ExternalLink, Trash2 } from "lucide-react";

type ProjectDepartment = {
  id: number;
  department: {
    id: number;
    name: string;
  };
};

type ProjectTask = {
  id: number;
  title: string;
  status: string;
  priority: string;
  slaHours: number | null;
  slaStartedAt: string | Date | null;
  startedAt: string | Date | null;
  slaPausedAt: string | Date | null;
  slaPausedDuration: number | null;
  submittedAt: string | Date | null;
  assignedTo: {
    name: string;
  } | null;
  assignedDepartment: {
    name: string;
  } | null;
};

type ProjectDetail = {
  id: number;
  title: string;
  briefLink: string | null;
  status: string;
  departments: ProjectDepartment[];
  tasks: ProjectTask[];
  briefLinks: { id: number; name: string; url: string }[];
};

type DepartmentOption = {
  id: number;
  name: string;
};

interface Props {
  project: ProjectDetail;
  departments: DepartmentOption[];
  canAddTask: boolean;
  canManageDepartments: boolean;
  canManageStatus: boolean;
  canManageBriefLinks: boolean;
}

function toDate(value: string | Date | null) {
  return value ? new Date(value) : null;
}

function formatRemaining(task: Pick<ProjectTask, "status" | "slaHours" | "slaStartedAt" | "slaPausedAt" | "slaPausedDuration">) {
  if (!task.slaHours || !task.slaStartedAt) return "-";
  if (task.status === "DONE" || task.status === "CANCELLED") return "-";

  const now = Date.now();
  const started = toDate(task.slaStartedAt)?.getTime();
  if (!started) return "-";

  const totalMs = task.slaHours * 60 * 60 * 1000;
  const pausedMs = (task.slaPausedDuration || 0) * 1000;

  let elapsed = now - started - pausedMs;
  if (task.slaPausedAt) {
    const pausedAt = toDate(task.slaPausedAt)?.getTime();
    if (pausedAt) elapsed = pausedAt - started - pausedMs;
  }

  const remaining = totalMs - elapsed;
  if (remaining <= 0) return "0h";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h`;
  return `${Math.max(1, minutes)}m`;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function statusDotClass(status: string) {
  switch (status) {
    case "DONE":
      return "bg-emerald-500";
    case "IN_PROGRESS":
      return "bg-indigo-500";
    case "SUBMITTED":
      return "bg-rose-500";
    case "PAUSED":
      return "bg-amber-500";
    case "CONFIRMED":
      return "bg-sky-500";
    case "ASSIGNED":
      return "bg-violet-500";
    default:
      return "bg-gray-400";
  }
}

function formatDuration(task: ProjectTask) {
  const startedAt = toDate(task.startedAt);
  const submittedAt = toDate(task.submittedAt);

  if (!startedAt || !submittedAt) return "Unavailable";

  const pausedMs = (task.slaPausedDuration || 0) * 1000;
  const rawMs = submittedAt.getTime() - startedAt.getTime() - pausedMs;
  const durationMs = Math.max(0, rawMs);

  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${Math.max(1, minutes)}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function monthKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
function calculateDueDate(task: ProjectTask): Date | null {
  if (!task.slaHours || !task.slaStartedAt) return null;
  const started = new Date(task.slaStartedAt).getTime();
  const totalMs = task.slaHours * 60 * 60 * 1000;
  const pausedMs = (task.slaPausedDuration || 0) * 1000;
  return new Date(started + totalMs - pausedMs);
}

export default function ProjectDetailClient({
  project,
  departments,
  canAddTask,
  canManageDepartments,
  canManageStatus,
  canManageBriefLinks,
}: Props) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(project.status);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showBriefLinkModal, setShowBriefLinkModal] = useState(false);
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
  const [showTaskSearch, setShowTaskSearch] = useState(false);
  const [showTaskFilters, setShowTaskFilters] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [briefLinkNameInput, setBriefLinkNameInput] = useState("");
  const [briefLinkUrlInput, setBriefLinkUrlInput] = useState("");
  const [briefLinkError, setBriefLinkError] = useState("");
  const [departmentError, setDepartmentError] = useState("");
  const [timesheetSearch, setTimesheetSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskDueFilter, setTaskDueFilter] = useState<"ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH">("ALL");
  const [taskStatusFilter, setTaskStatusFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();
  const [statusError, setStatusError] = useState("");

  const handleStatusChange = (action: "close" | "pause" | "resume") => {
    const messages = {
      close: "Close this project? This marks it as completed.",
      pause: "Pause this project? No new tasks can be created while paused.",
      resume: "Resume this project and set it back to active?",
    };
    if (!confirm(messages[action])) return;
    setStatusError("");
    startTransition(async () => {
      try {
        if (action === "close") {
          await closeProject(project.id);
          setCurrentStatus("COMPLETED");
        } else if (action === "pause") {
          await pauseProject(project.id);
          setCurrentStatus("ON_HOLD");
        } else {
          await resumeProject(project.id);
          setCurrentStatus("ACTIVE");
        }
        router.refresh();
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : "Failed to update project status");
      }
    });
  };

  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((task) => task.status === "DONE").length;
  const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const hasOverdue = project.tasks.some((task) => {
    if (["DONE", "CANCELLED"].includes(task.status)) return false;
    const started = toDate(task.slaStartedAt);
    if (!started || !task.slaHours) return false;
    return started.getTime() + task.slaHours * 3600000 < Date.now();
  });

  const completionBarColor = completion === 100 ? "bg-green-500" : hasOverdue ? "bg-red-500" : "bg-yellow-400";
  const completionTextColor = completion === 100 ? "text-green-600" : hasOverdue ? "text-red-600" : "text-yellow-600";

  const dueDate = project.tasks
    .filter((task) => task.submittedAt)
    .map((task) => toDate(task.submittedAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const priorityOrder: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const topPriority =
    project.tasks
      .map((task) => task.priority)
      .sort((a, b) => (priorityOrder[b] || 0) - (priorityOrder[a] || 0))[0] || "MEDIUM";

  const availableDepartments = useMemo(() => {
    const existingIds = new Set(project.departments.map((department) => department.department.id));
    return departments.filter((department) => !existingIds.has(department.id));
  }, [departments, project.departments]);

  const briefLinks = useMemo(
    () =>
      (project.briefLinks || []).map((entry) => ({
        ...entry,
        url: /^https?:\/\//i.test(entry.url) ? entry.url : `https://${entry.url}`,
      })),
    [project.briefLinks]
  );

  const taskStatuses = useMemo(
    () => ["ALL", ...Array.from(new Set(project.tasks.map((task) => task.status)))],
    [project.tasks]
  );

  const filteredTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return project.tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.assignedTo?.name || "").toLowerCase().includes(query) ||
        (task.assignedDepartment?.name || "").toLowerCase().includes(query);

      const matchesStatus = taskStatusFilter === "ALL" || task.status === taskStatusFilter;

      const matchesDueDate = (() => {
        if (taskDueFilter === "ALL") return true;
        const dueDate = calculateDueDate(task);
        if (!dueDate) return true;
        if (taskDueFilter === "TODAY") return dueDate >= startOfToday && dueDate < endOfToday;
        if (taskDueFilter === "THIS_WEEK") return dueDate >= startOfWeek && dueDate < endOfWeek;
        if (taskDueFilter === "THIS_MONTH") return dueDate >= startOfMonth && dueDate < endOfMonth;
        return true;
      })();

      return matchesSearch && matchesStatus && matchesDueDate;
    });
  }, [project.tasks, taskSearch, taskStatusFilter, taskDueFilter]);

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set(
        project.tasks
          .map((task) => toDate(task.submittedAt))
          .filter((date): date is Date => Boolean(date))
          .map((date) => monthKey(date))
      )
    ).sort((a, b) => b.localeCompare(a));
  }, [project.tasks]);

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0] || "ALL");

  const timesheetRows = useMemo(() => {
    const query = timesheetSearch.trim().toLowerCase();

    return project.tasks.filter((task) => {
      const submittedAt = toDate(task.submittedAt);
      if (selectedMonth !== "ALL") {
        if (!submittedAt || monthKey(submittedAt) !== selectedMonth) return false;
      }

      if (!query) return true;

      const haystack = [
        task.title,
        task.assignedTo?.name || "",
        task.assignedDepartment?.name || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [project.tasks, selectedMonth, timesheetSearch]);

  const exportCsv = () => {
    const lines = [
      ["Task", "Assigned Person", "Department", "Submission Month", "Time Taken"],
      ...timesheetRows.map((task) => {
        const submittedAt = toDate(task.submittedAt);
        return [
          task.title,
          task.assignedTo?.name || "Unassigned",
          task.assignedDepartment?.name || "General",
          submittedAt ? monthLabel(monthKey(submittedAt)) : "Not submitted",
          formatDuration(task),
        ];
      }),
    ];

    const csv = lines
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-${project.id}-timesheet.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddDepartment = () => {
    if (!selectedDepartmentId) {
      setDepartmentError("Select a department to add.");
      return;
    }

    setDepartmentError("");
    startTransition(async () => {
      try {
        await addDepartmentToProject(project.id, parseInt(selectedDepartmentId, 10));
        setShowDepartmentModal(false);
        setSelectedDepartmentId("");
        router.refresh();
      } catch (error) {
        setDepartmentError(error instanceof Error ? error.message : "Failed to add department.");
      }
    });
  };

  const handleAddBriefLink = () => {
    const name = briefLinkNameInput.trim();
    const url = briefLinkUrlInput.trim();

    if (!name || !url) {
      setBriefLinkError("Link name and URL are required.");
      return;
    }

    setBriefLinkError("");
    startTransition(async () => {
      try {
        await addProjectBriefLink(project.id, name, url);
        setShowBriefLinkModal(false);
        setBriefLinkNameInput("");
        setBriefLinkUrlInput("");
        router.refresh();
      } catch (error) {
        setBriefLinkError(error instanceof Error ? error.message : "Failed to add brief link.");
      }
    });
  };

  const handleDeleteBriefLink = (linkId: number) => {
    if (!confirm("Delete this brief link?")) return;

    setBriefLinkError("");
    startTransition(async () => {
      try {
        await deleteProjectBriefLink(project.id, linkId);
        router.refresh();
      } catch (error) {
        setBriefLinkError(error instanceof Error ? error.message : "Failed to delete brief link.");
      }
    });
  };

  return (
    <>
      <div className="space-y-0 -mx-8 -mt-8">
        <section className="bg-white dark:bg-[#111111] px-8 py-7 lg:px-10 lg:py-8 border-b border-[#e7eaf2] dark:border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.16em]">
                <span className="inline-flex items-center rounded-full bg-rose-100 dark:bg-rose-500/15 px-2 py-1 text-[8px] text-rose-600 dark:text-rose-300">
                  {currentStatus}
                </span>
                <span className="text-[#7f8798] dark:text-zinc-500">Project ID: CP-{project.id}</span>
              </div>
              <h1 className="text-[29px] md:text-[34px] leading-[0.95] font-black tracking-tight text-[#122038] dark:text-white max-w-[760px]">
                {project.title}
              </h1>
            </div>

            {canAddTask && currentStatus === "ACTIVE" && (
              <Link
                href={`/tasks/new?projectId=${project.id}`}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#c91f41] px-6 text-sm font-black text-white shadow-lg shadow-[#c91f41]/25 hover:bg-[#aa1a37]"
              >
                <Plus className="h-4 w-4" />
                New Task
              </Link>
            )}
            {canManageStatus && (
              <div className="flex items-center gap-2">
                {currentStatus === "ACTIVE" && (
                  <button
                    onClick={() => handleStatusChange("pause")}
                    disabled={isPending}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 text-xs font-black text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                  >
                    <PauseCircle className="h-4 w-4" />
                    Pause
                  </button>
                )}
                {currentStatus === "ON_HOLD" && (
                  <button
                    onClick={() => handleStatusChange("resume")}
                    disabled={isPending}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Resume
                  </button>
                )}
                {(currentStatus === "ACTIVE" || currentStatus === "ON_HOLD") && (
                  <button
                    onClick={() => handleStatusChange("close")}
                    disabled={isPending}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 text-xs font-black text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-white/20 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Close Project
                  </button>
                )}
              </div>
            )}
            {statusError && (
              <p className="text-xs font-bold text-red-500 mt-1 self-end">{statusError}</p>
            )}
          </div>
        </section>

        <section className="bg-[#eef0f5] dark:bg-black px-8 py-7 lg:px-10 lg:py-8">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-7">
            <div className="xl:col-span-4 space-y-7">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7f8798] dark:text-zinc-500">Departments Involved</p>
                  {canManageDepartments && availableDepartments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowDepartmentModal(true)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#dfe5f2] dark:bg-white/10 text-[#44506a] dark:text-zinc-300 hover:text-[#c91f41]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.departments.map((department, index) => (
                    <span
                      key={department.id}
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-[10px] font-black",
                        index === 0
                          ? "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300"
                          : "bg-[#dfe5f2] dark:bg-white/10 text-[#44506a] dark:text-zinc-300"
                      )}
                    >
                      {department.department.name}
                    </span>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7f8798] dark:text-zinc-500">Brief Links</p>
                    {canManageBriefLinks && (
                      <button
                        type="button"
                        onClick={() => {
                          setBriefLinkError("");
                          setBriefLinkNameInput("");
                          setBriefLinkUrlInput("");
                          setShowBriefLinkModal(true);
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#dfe5f2] dark:bg-white/10 text-[#44506a] dark:text-zinc-300 hover:text-[#c91f41]"
                        aria-label="Add brief link"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {briefLinks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {briefLinks.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between rounded-xl border border-[#d8deeb] dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2"
                        >
                          <p className="text-xs font-black text-[#1f2b40] dark:text-zinc-200 truncate pr-3">{link.name}</p>
                          <div className="flex items-center gap-2">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#e1e6f1] dark:bg-white/10 text-[#51607a] dark:text-zinc-300 hover:text-[#c91f41]"
                              aria-label={`Open ${link.name}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            {canManageBriefLinks && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBriefLink(link.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/25"
                                aria-label={`Delete ${link.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-[#44506a] dark:text-zinc-400">None</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-[#e5eaf5] dark:bg-[#111111] border border-[#d8deeb] dark:border-white/10 p-5 space-y-5 max-w-[260px]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6e778a] dark:text-zinc-500">Project Snapshot</p>

                <div>
                  <div className="flex items-center justify-between text-[12px] font-bold text-[#25324a] dark:text-zinc-300">
                    <span>Completion</span>
                    <span className={completionTextColor}>{completion}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#d5dced] dark:bg-white/10">
                    <div className={`h-full rounded-full ${completionBarColor}`} style={{ width: `${completion}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7f8798] dark:text-zinc-500">Due Date</p>
                    <p className="mt-1 text-sm font-black text-[#1a2740] dark:text-white">
                      {dueDate
                        ? dueDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                        : "TBD"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7f8798] dark:text-zinc-500">Priority</p>
                    <p className="mt-1 text-sm font-black text-rose-600 dark:text-rose-300">{topPriority}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTimesheetModal(true)}
                  className="w-full inline-flex items-center justify-center rounded-xl border border-[#d8deeb] dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#2a354d] dark:text-zinc-300 hover:text-[#c91f41]"
                >
                  View Timesheet
                </button>
              </div>
            </div>

            <div className="xl:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[29px] leading-none font-black tracking-tight text-[#1b2942] dark:text-white">Tasks ({filteredTasks.length})</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskFilters((prev) => !prev)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#e1e6f1] dark:bg-white/10 text-[#6f7a8e] dark:text-zinc-400 hover:text-[#c91f41]"
                  >
                    <Filter className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskSearch((prev) => !prev)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#e1e6f1] dark:bg-white/10 text-[#6f7a8e] dark:text-zinc-400 hover:text-[#c91f41]"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {showTaskSearch && (
                <div className="relative max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f7a8e] dark:text-zinc-500" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="Search task, assignee, or department"
                    className="w-full h-10 rounded-xl border border-[#d8deeb] dark:border-white/10 bg-white dark:bg-white/5 pl-10 pr-3 text-xs font-semibold text-[#1d2940] dark:text-zinc-200 outline-none"
                  />
                </div>
              )}

              {showTaskFilters && (
                <div className="flex flex-col md:flex-row md:items-center gap-3 rounded-xl border border-[#d8deeb] dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["ALL", "TODAY", "THIS_WEEK", "THIS_MONTH"] as const).map((filterKey) => (
                      <button
                        key={filterKey}
                        type="button"
                        onClick={() => setTaskDueFilter(filterKey)}
                        className={cn(
                          "h-8 rounded-lg px-3 text-[10px] font-black uppercase tracking-[0.15em]",
                          taskDueFilter === filterKey
                            ? "bg-[#c91f41] text-white"
                            : "bg-[#e1e6f1] dark:bg-white/10 text-[#51607a] dark:text-zinc-300"
                        )}
                      >
                        {filterKey.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                  <select
                    value={taskStatusFilter}
                    onChange={(event) => setTaskStatusFilter(event.target.value)}
                    className="h-8 rounded-lg border border-[#d8deeb] dark:border-white/10 bg-white dark:bg-black px-3 text-[10px] font-black uppercase tracking-[0.15em] text-[#2a354d] dark:text-zinc-300 outline-none"
                  >
                    {taskStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl bg-transparent">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="text-left text-[9px] font-black uppercase tracking-[0.2em] text-[#7f8798] dark:text-zinc-500 border-b border-[#dde1ea] dark:border-white/10">
                      <th className="px-4 py-3">Task Name</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Time Rem.</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="border-b border-[#dde1ea] dark:border-white/10 last:border-b-0 hover:bg-white/30 dark:hover:bg-white/5">
                        <td className="px-4 py-4">
                          <Link href={`/tasks/${task.id}`} className="block">
                            <p className="text-[14px] leading-tight font-black tracking-tight text-[#122038] dark:text-white hover:text-[#c91f41]">
                              {task.title}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-[#7f8798] dark:text-zinc-500">
                              Assigned to {task.assignedTo?.name || "Unassigned"}
                            </p>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-[#dfe5f2] dark:bg-white/10 px-2.5 py-1 text-[10px] font-black text-[#44506a] dark:text-zinc-300">
                            {task.assignedDepartment?.name || "General"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-black text-[#223149] dark:text-zinc-300">{formatRemaining(task)}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#4a556d] dark:text-zinc-400">
                            <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClass(task.status))} />
                            {statusLabel(task.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredTasks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm font-semibold text-[#7f8798] dark:text-zinc-500">
                          No tasks match this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 text-center">
                <Link href="/tasks" className="text-[10px] font-black uppercase tracking-[0.24em] text-[#2a354d] dark:text-zinc-300 hover:text-[#c91f41]">
                  View all tasks archive
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showDepartmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowDepartmentModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10 shadow-2xl dark:shadow-black/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7f8798] dark:text-zinc-500">Project Departments</p>
                <h3 className="mt-1 text-xl font-black text-[#122038] dark:text-white">Add Department</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDepartmentModal(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-zinc-500 hover:text-[#c91f41]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <select
                value={selectedDepartmentId}
                onChange={(event) => setSelectedDepartmentId(event.target.value)}
                className="w-full h-12 rounded-2xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none"
              >
                <option value="">Select department...</option>
                {availableDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>

              {departmentError && <p className="text-xs font-semibold text-red-600">{departmentError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepartmentModal(false)}
                  className="rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddDepartment}
                  disabled={isPending}
                  className="rounded-xl bg-[#c91f41] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:bg-[#aa1a37] disabled:opacity-60"
                >
                  {isPending ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBriefLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowBriefLinkModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10 shadow-2xl dark:shadow-black/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7f8798] dark:text-zinc-500">Project Brief</p>
                <h3 className="mt-1 text-xl font-black text-[#122038] dark:text-white">Add Brief Link</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBriefLinkModal(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-zinc-500 hover:text-[#c91f41]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Link Name (e.g. Creative Brief)"
                value={briefLinkNameInput}
                onChange={(event) => setBriefLinkNameInput(event.target.value)}
                className="w-full h-12 rounded-2xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 px-4 text-sm font-medium text-gray-900 dark:text-white outline-none"
              />

              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-600" />
                <input
                  type="url"
                  placeholder="https://..."
                  value={briefLinkUrlInput}
                  onChange={(event) => setBriefLinkUrlInput(event.target.value)}
                  className="w-full h-12 rounded-2xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 pl-11 pr-4 text-sm font-medium text-gray-900 dark:text-white outline-none"
                />
              </div>

              {briefLinkError && <p className="text-xs font-semibold text-red-600">{briefLinkError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBriefLinkModal(false)}
                  className="rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddBriefLink}
                  disabled={isPending}
                  className="rounded-xl bg-[#c91f41] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:bg-[#aa1a37] disabled:opacity-60"
                >
                  {isPending ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTimesheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowTimesheetModal(false)} />
          <div className="relative w-full max-w-6xl rounded-3xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10 shadow-2xl dark:shadow-black/60 overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-white/10 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7f8798] dark:text-zinc-500">Project Reporting</p>
                <h3 className="mt-1 text-2xl font-black text-[#122038] dark:text-white">Timesheet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTimesheetModal(false)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-zinc-500 hover:text-[#c91f41]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-600" />
                    <input
                      type="text"
                      value={timesheetSearch}
                      onChange={(event) => setTimesheetSearch(event.target.value)}
                      placeholder="Search task, assignee, or department"
                      className="w-full h-11 rounded-2xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 pl-11 pr-4 text-sm font-medium text-gray-900 dark:text-white outline-none"
                    />
                  </div>

                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="h-11 rounded-2xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none"
                  >
                    <option value="ALL">All months</option>
                    {monthOptions.map((option) => (
                      <option key={option} value={option}>
                        {monthLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#c91f41] px-5 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:bg-[#aa1a37]"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10">
                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full min-w-[900px]">
                    <thead className="sticky top-0 bg-[#f8fafc] dark:bg-black z-10">
                      <tr className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-[#7f8798] dark:text-zinc-500 border-b border-gray-100 dark:border-white/10">
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3">Assigned</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3">Time Taken</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timesheetRows.map((task) => {
                        const submittedAt = toDate(task.submittedAt);
                        return (
                          <tr key={task.id} className="border-b border-gray-100 dark:border-white/10 last:border-b-0 hover:bg-gray-50/80 dark:hover:bg-white/5">
                            <td className="px-4 py-4">
                              <div>
                                <p className="text-sm font-black text-[#122038] dark:text-white">{task.title}</p>
                                <p className="mt-1 text-[11px] font-medium text-[#7f8798] dark:text-zinc-500">Task #{task.id}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-bold text-[#223149] dark:text-zinc-300">
                              {task.assignedTo?.name || "Unassigned"}
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex rounded-full bg-[#dfe5f2] dark:bg-white/10 px-2.5 py-1 text-[10px] font-black text-[#44506a] dark:text-zinc-300">
                                {task.assignedDepartment?.name || "General"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm font-bold text-[#223149] dark:text-zinc-300">
                              {submittedAt ? monthLabel(monthKey(submittedAt)) : "Not submitted"}
                            </td>
                            <td className="px-4 py-4 text-sm font-black text-[#223149] dark:text-zinc-300">
                              {formatDuration(task)}
                            </td>
                          </tr>
                        );
                      })}

                      {timesheetRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-sm font-semibold text-[#7f8798] dark:text-zinc-500">
                            No timesheet rows match this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}