"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createDailyLogs } from "@/app/actions/dailyLogActions";
import { Calendar01Icon, Add01Icon, Search01Icon, Tick01Icon, Cancel01Icon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

type TaskOption = {
  id: number;
  title: string;
  status: string;
};

type ProjectOption = {
  id: number;
  title: string;
  clientName: string;
  tasks: TaskOption[];
};

type DailyLogRow = {
  id: number;
  loggedAt: string;
  projectId: number | null;
  projectTitle: string;
  taskId: number | null;
  taskTitle: string;
  parentTaskTitle?: string;
  note: string;
  markCompleted: boolean;
};

type FilterMode = "daily" | "weekly" | "monthly";

interface Props {
  projects: ProjectOption[];
  initialLogs: DailyLogRow[];
}

function isInRange(date: Date, mode: FilterMode) {
  const now = new Date();

  if (mode === "daily") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  if (mode === "weekly") {
    const start = new Date(now);
    const day = start.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + offset);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return date >= start && date < end;
  }

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export default function DailyLogClient({ projects, initialLogs }: Props) {
  const router = useRouter();

  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("daily");

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [markCompleted, setMarkCompleted] = useState(false);
  const [isGeneralLog, setIsGeneralLog] = useState(false);

  const [queuedEntries, setQueuedEntries] = useState<
    { projectId: number | null; taskId: number | null; note: string; markCompleted: boolean }[]
  >([]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const availableTasks = selectedProject?.tasks ?? [];

  const filteredLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return initialLogs.filter((row) => {
      const date = new Date(row.loggedAt);
      if (!isInRange(date, filterMode)) return false;

      if (!needle) return true;

      return (
        row.projectTitle.toLowerCase().includes(needle) ||
        row.taskTitle.toLowerCase().includes(needle) ||
        row.note.toLowerCase().includes(needle)
      );
    });
  }, [initialLogs, filterMode, search]);

  const resetWizard = () => {
    setStep(1);
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setNote("");
    setMarkCompleted(false);
    setIsGeneralLog(false);
    setQueuedEntries([]);
    setError("");
  };

  const closeWizard = () => {
    setShowWizard(false);
    resetWizard();
  };

  const addCurrentEntry = () => {
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setError("Please write what you did");
      return false;
    }

    setQueuedEntries((prev) => [
      ...prev,
      {
        projectId: selectedProjectId,
        taskId: selectedTaskId,
        note: trimmedNote,
        markCompleted,
      },
    ]);

    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setNote("");
    setMarkCompleted(false);
    setStep(1);
    setError("");

    return true;
  };

  const submitLogs = async () => {
    const finalEntries = [...queuedEntries];

    if (note.trim()) {
      const trimmedNote = note.trim();

      finalEntries.push({
        projectId: selectedProjectId,
        taskId: selectedTaskId,
        note: trimmedNote,
        markCompleted,
      });
    }

    if (finalEntries.length === 0) {
      setError("Add at least one log entry before completing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createDailyLogs({ entries: finalEntries });
      closeWizard();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save daily logs");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 pb-8">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 dark:border-white/10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c91f41]">Execution Notes</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-gray-900 dark:text-white">Daily Log</h1>
          <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-zinc-400">
            Record what you worked on and keep task activity timelines updated.
          </p>
        </div>

        <button
          onClick={() => {
            setShowWizard(true);
            resetWizard();
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-black dark:bg-white dark:text-black"
        >
          <Add01Icon className="h-4 w-4" />
          Add Log
        </button>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white dark:border-white/10 dark:bg-black/40">
        <div className="space-y-4 border-b border-gray-100 px-5 py-4 dark:border-white/10">
          <div className="relative">
            <Search01Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by project, task, or note"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#c91f41]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5">
            {([
              { key: "daily", label: "Daily" },
              { key: "weekly", label: "Weekly" },
              { key: "monthly", label: "Monthly" },
            ] as const).map((item) => (
              <button
                key={item.key}
                onClick={() => setFilterMode(item.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition",
                  filterMode === item.key
                    ? "bg-[#c91f41] text-white"
                    : "text-gray-500 hover:text-[#c91f41] dark:text-zinc-400"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[620px] overflow-auto">
          <table className="w-full min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-white dark:bg-black/80">
              <tr className="border-b border-gray-100 text-left text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:border-white/10">
                <th className="px-5 py-3">Logged At</th>
                <th className="px-5 py-3">Project</th>
                <th className="px-5 py-3">Task</th>
                <th className="px-5 py-3">What Was Done</th>
                <th className="px-5 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm font-semibold text-gray-500 dark:text-zinc-400">
                    No daily logs found for this filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 align-top dark:border-white/10">
                    <td className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-zinc-300">
                      {new Date(row.loggedAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900 dark:text-white">{row.projectTitle || "General"}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-zinc-300">
                      <p>{row.taskTitle || "—"}</p>
                      {row.parentTaskTitle && row.parentTaskTitle !== row.taskTitle ? (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                          Parent: {row.parentTaskTitle}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-zinc-300">{row.note}</td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                          row.markCompleted
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        )}
                      >
                        {row.markCompleted ? "Completed" : "Progress"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60" onClick={closeWizard} />
          <div className="relative w-full max-w-2xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-black">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41]">Log Wizard</p>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Add Daily Log</h2>
              </div>
              <button onClick={closeWizard} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                <Cancel01Icon className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-2">
              {[1, 2, 3].map((idx) => (
                <span
                  key={idx}
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    step >= idx ? "w-8 bg-[#c91f41]" : "w-2.5 bg-gray-200 dark:bg-white/15"
                  )}
                />
              ))}
            </div>

            {step === 1 ? (
              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400">
                  Select Project
                </label>
                <select
                  value={isGeneralLog ? "general" : (selectedProjectId ?? "")}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "general") {
                      setIsGeneralLog(true);
                      setSelectedProjectId(null);
                      setSelectedTaskId(null);
                    } else {
                      setIsGeneralLog(false);
                      setSelectedProjectId(value ? Number(value) : null);
                      setSelectedTaskId(null);
                    }
                    setError("");
                  }}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="">Choose project</option>
                  <option value="general">General Log (No Project)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.clientName} - {project.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400">
                  Select Associated Task
                </label>
                <select
                  value={selectedTaskId ?? ""}
                  onChange={(event) => {
                    setSelectedTaskId(event.target.value ? Number(event.target.value) : null);
                    setError("");
                  }}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="">Choose task</option>
                  {availableTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title} ({task.status.replaceAll("_", " ")})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400">
                  What did you do?
                </label>
                <textarea
                  rows={5}
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setError("");
                  }}
                  placeholder="Describe what you worked on today"
                  className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#c91f41]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />

                <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={markCompleted}
                    onChange={(event) => setMarkCompleted(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#c91f41] focus:ring-[#c91f41]"
                  />
                  Mark as completed in this log
                </label>

                {queuedEntries.length > 0 ? (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400">
                      Queued Entries: {queuedEntries.length}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                      {queuedEntries.map((entry, index) => {
                        if (!entry.projectId) {
                          return (
                            <li key={`general-${index}`}>
                              General Log - {entry.markCompleted ? "Completed" : "Progress"}
                            </li>
                          );
                        }
                        const project = projects.find((item) => item.id === entry.projectId);
                        const task = project?.tasks.find((item) => item.id === entry.taskId);
                        return (
                          <li key={`${entry.taskId}-${index}`}>
                            {task?.title || "Task"} - {entry.markCompleted ? "Completed" : "Progress"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="mt-4 text-sm font-bold text-rose-500">{error}</p> : null}

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-white/10">
              {step > 1 ? (
                <button
                  onClick={() => {
                    setStep((prev) => Math.max(1, prev - 1));
                    setError("");
                  }}
                  className="text-xs font-black uppercase tracking-[0.14em] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  onClick={() => {
                    if (step === 1) {
                      if (isGeneralLog) {
                        setError("");
                        setStep(3);
                        return;
                      }
                      if (!selectedProjectId) {
                        setError("Please select a project or choose General Log");
                        return;
                      }
                    }
                    if (step === 2 && !selectedTaskId) {
                      setError("Please select an associated task to continue");
                      return;
                    }

                    setError("");
                    setStep((prev) => Math.min(3, prev + 1));
                  }}
                  className="rounded-xl bg-[#111827] px-5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white dark:bg-white dark:text-black"
                >
                  Continue
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={addCurrentEntry}
                    disabled={loading}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-700 dark:border-white/10 dark:text-zinc-300"
                  >
                    Add Another
                  </button>
                  <button
                    onClick={submitLogs}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#c91f41] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60"
                  >
                    <Tick01Icon className="h-4 w-4" />
                    {loading ? "Saving..." : "Complete"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
