"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createLeave, cancelLeave, updateLeaveHandovers } from "@/app/actions/hrActions";
import {
  Calendar01Icon,
  Add01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  NoteIcon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

type LeaveRequest = {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string;
  handovers?: {
    taskId: number;
    taskTitle: string;
    delegateUserId: number;
    delegateUserName: string;
    status: string;
  }[];
};

type LeaveBalance = {
  type: string;
  daysAllowed: number;
  usedDays: number;
  remainingDays: number;
};

type ActiveTask = {
  id: number;
  title: string;
  status: string;
  projectTitle: string;
};

type DepartmentMember = {
  id: number;
  name: string;
};

interface Props {
  initialLeaves: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  holidayDates: string[];
  activeTasks: ActiveTask[];
  departmentMembers: DepartmentMember[];
}

const STEPS = [
  { id: 1, title: "Nature", icon: InformationCircleIcon },
  { id: 2, title: "Duration", icon: Calendar01Icon },
  { id: 3, title: "Reason", icon: NoteIcon },
  { id: 4, title: "Handover", icon: ArrowRight01Icon },
];

const formatTypeLabel = (value: string) => value.replaceAll("_", " ");

export default function LeaveClient({ initialLeaves, leaveBalances, holidayDates, activeTasks, departmentMembers }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showEditHandoverModal, setShowEditHandoverModal] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [handoverSaving, setHandoverSaving] = useState(false);

  const availableLeaveTypes = useMemo(() => leaveBalances.map((entry) => entry.type), [leaveBalances]);
  const defaultType = availableLeaveTypes[0] ?? "";

  const [formData, setFormData] = useState({
    type: defaultType,
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [handoverDelegates, setHandoverDelegates] = useState<Record<number, number>>({});
  const [editSelectedTaskIds, setEditSelectedTaskIds] = useState<number[]>([]);
  const [editHandoverDelegates, setEditHandoverDelegates] = useState<Record<number, number>>({});
  const [wizardError, setWizardError] = useState("");

  const holidaySet = useMemo(() => {
    return new Set(
      holidayDates.map((dateValue) => {
        const d = new Date(dateValue);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );
  }, [holidayDates]);

  const selectedBalance = useMemo(
    () => leaveBalances.find((entry) => entry.type === formData.type),
    [leaveBalances, formData.type]
  );

  const selectedRangeDays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0;

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 0;
    }

    let totalDays = 0;
    const cursor = new Date(start);

    while (cursor <= end) {
      const day = cursor.getDay();
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
      if (day !== 0 && day !== 6 && !holidaySet.has(key)) {
        totalDays += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return totalDays;
  }, [formData.startDate, formData.endDate, holidaySet]);

  const exceedsBalance =
    selectedBalance != null && selectedRangeDays > 0 && selectedRangeDays > selectedBalance.remainingDays;

  const allTaskIds = useMemo(() => activeTasks.map((task) => task.id), [activeTasks]);
  const selectedTaskSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds]);

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTaskIds((prev) => {
      if (prev.includes(taskId)) {
        const next = prev.filter((id) => id !== taskId);
        setHandoverDelegates((delegateMap) => {
          const copy = { ...delegateMap };
          delete copy[taskId];
          return copy;
        });
        return next;
      }
      return [...prev, taskId];
    });
  };

  const toggleSelectAllTasks = () => {
    if (selectedTaskIds.length === allTaskIds.length) {
      setSelectedTaskIds([]);
      setHandoverDelegates({});
      return;
    }
    setSelectedTaskIds(allTaskIds);
  };

  const resetForm = () => {
    setFormData({
      type: defaultType,
      startDate: "",
      endDate: "",
      reason: "",
    });
    setSelectedTaskIds([]);
    setHandoverDelegates({});
    setCurrentStep(1);
    setWizardError("");
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async () => {
    const missingDelegateTask = selectedTaskIds.find((taskId) => !handoverDelegates[taskId]);
    if (missingDelegateTask) {
      setWizardError("Please choose a handover teammate for every selected task.");
      return;
    }

    setLoading(true);
    setWizardError("");
    try {
      await createLeave({
        type: formData.type as any,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        handovers: selectedTaskIds.map((taskId) => ({
          taskId,
          delegateUserId: handoverDelegates[taskId],
        })),
      });
      setShowModal(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setWizardError("");

    if (currentStep === 2) {
      if (!formData.startDate || !formData.endDate) {
        setWizardError("Please select both start and end dates.");
        return;
      }
      if (selectedRangeDays === 0) {
        setWizardError("Selected range falls on weekends/public holidays only.");
        return;
      }
      if (exceedsBalance) {
        setWizardError("Selected dates exceed the remaining leave days for this leave type.");
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const openEditHandoverModal = (leave: LeaveRequest) => {
    const editable = leave.handovers ?? [];
    setEditingLeaveId(leave.id);
    setEditSelectedTaskIds(editable.map((item) => item.taskId));
    setEditHandoverDelegates(
      editable.reduce<Record<number, number>>((acc, item) => {
        acc[item.taskId] = item.delegateUserId;
        return acc;
      }, {})
    );
    setWizardError("");
    setShowEditHandoverModal(true);
  };

  const toggleEditTaskSelection = (taskId: number) => {
    setEditSelectedTaskIds((prev) => {
      if (prev.includes(taskId)) {
        const next = prev.filter((id) => id !== taskId);
        setEditHandoverDelegates((delegateMap) => {
          const copy = { ...delegateMap };
          delete copy[taskId];
          return copy;
        });
        return next;
      }
      return [...prev, taskId];
    });
  };

  const toggleEditSelectAllTasks = () => {
    if (editSelectedTaskIds.length === allTaskIds.length) {
      setEditSelectedTaskIds([]);
      setEditHandoverDelegates({});
      return;
    }
    setEditSelectedTaskIds(allTaskIds);
  };

  const handleSaveEditedHandovers = async () => {
    if (!editingLeaveId) return;

    const missingDelegateTask = editSelectedTaskIds.find((taskId) => !editHandoverDelegates[taskId]);
    if (missingDelegateTask) {
      setWizardError("Please choose a handover teammate for every selected task.");
      return;
    }

    setHandoverSaving(true);
    setWizardError("");
    try {
      await updateLeaveHandovers(
        editingLeaveId,
        editSelectedTaskIds.map((taskId) => ({
          taskId,
          delegateUserId: editHandoverDelegates[taskId],
        }))
      );
      setShowEditHandoverModal(false);
      setEditingLeaveId(null);
      router.refresh();
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : "Unable to update handovers");
    } finally {
      setHandoverSaving(false);
    }
  };

  const handleCancelLeave = async (leaveId: number) => {
    if (!confirm("Cancel this leave request?")) return;
    try {
      await cancelLeave(leaveId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to cancel leave");
    }
  };

  const canProceedFromStep1 = currentStep !== 1 || Boolean(formData.type);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-white/10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-50 dark:bg-pink-500/10 rounded-xl">
              <Calendar01Icon className="w-5 h-5 text-pink-600" />
            </div>
            <span className="text-[11px] font-black text-pink-600 uppercase tracking-[0.2em] leading-none">Absence Protocol</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[#111827] dark:text-white leading-none">
            Leave <span className="text-pink-600 italic">Management</span>
          </h1>
          <p className="text-[#9ca3af] dark:text-zinc-500 font-bold text-[13px] tracking-tight">
            Request and track your time-off applications securely.
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            resetForm();
          }}
          className="group flex items-center gap-3 bg-[#111827] dark:bg-black hover:bg-black dark:hover:bg-pink-500/10 border border-transparent dark:border-white/10 text-white rounded-2xl px-6 py-4 shadow-xl hover:shadow-pink-500/20 transition-all active:scale-95"
        >
          <div className="w-6 h-6 rounded-lg bg-white/10 dark:bg-pink-500/20 flex items-center justify-center">
            <Add01Icon className="w-3.5 h-3.5 text-white dark:text-pink-500" />
          </div>
          <span className="font-black text-sm uppercase tracking-widest">Submit Application</span>
        </button>
      </div>

      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
            {initialLeaves.length} request{initialLeaves.length !== 1 ? "s" : ""} on record
          </p>
        </div>
        <div className="overflow-x-auto">
          {initialLeaves.length > 0 ? (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-[10px] text-gray-400 font-black tracking-[0.16em] uppercase border-b border-gray-100 dark:border-white/10">
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Start Date</th>
                  <th className="px-6 py-3">End Date</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {initialLeaves.map((item) => {
                  const start = new Date(item.startDate);
                  const end = new Date(item.endDate);
                  const canEditHandover =
                    ["PENDING", "APPROVED"].includes(item.status) && new Date() < start;
                  const statusColors: Record<string, string> = {
                    APPROVED:
                      "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
                    DENIED:
                      "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
                    PENDING:
                      "bg-pink-50 text-pink-700 border border-pink-100 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/20",
                    CANCELLED:
                      "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-white/5 dark:text-zinc-300 dark:border-white/10",
                  };
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 dark:border-white/10 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-xs font-black uppercase tracking-widest text-pink-600 dark:text-pink-300 bg-pink-50 dark:bg-pink-500/10 px-2.5 py-1 rounded-lg">
                          {formatTypeLabel(item.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-zinc-200">{start.toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-zinc-200">{end.toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{item.totalDays}d</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-zinc-400 max-w-[220px] truncate">{item.reason || "-"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${statusColors[item.status] ?? "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-300"}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {canEditHandover ? (
                            <button
                              onClick={() => openEditHandoverModal(item)}
                              className="inline-flex h-8 items-center rounded-lg border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                            >
                              Edit Handover
                            </button>
                          ) : null}
                          {item.status === "PENDING" ? (
                            <button
                              onClick={() => handleCancelLeave(item.id)}
                              className="inline-flex h-8 items-center rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20"
                            >
                              Cancel Request
                            </button>
                          ) : !canEditHandover ? (
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300 dark:text-zinc-600">No Action</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <Calendar01Icon className="w-10 h-10 text-gray-200 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400 dark:text-zinc-500">No leave applications found</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 transition-opacity" onClick={closeModal} />
          <div className="relative bg-white dark:bg-black rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all",
                      currentStep >= step.id ? "bg-pink-600 w-8" : "bg-gray-200 dark:bg-white/10"
                    )}
                  />
                ))}
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <Cancel01Icon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="min-h-[300px] flex flex-col justify-center">
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Select Nature</h2>
                  {availableLeaveTypes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {availableLeaveTypes.map((type) => {
                        const isActive = formData.type === type;
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, type }));
                              setCurrentStep(2);
                            }}
                            className={cn(
                              "h-16 px-6 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all text-left flex items-center justify-between",
                              isActive
                                ? "border-pink-600 bg-pink-50/50 dark:bg-pink-500/10 text-pink-600"
                                : "border-gray-50 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-zinc-400"
                            )}
                          >
                            {formatTypeLabel(type)}
                            {isActive && <ArrowRight01Icon className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-rose-500">No leave types are configured by HR for your role yet.</p>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Duration</h2>
                  <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Selected Leave Balance</p>
                    <p className="mt-2 text-sm font-extrabold text-gray-800 dark:text-zinc-200">
                      {formatTypeLabel(formData.type)}: {selectedBalance?.remainingDays ?? 0} day(s) remaining
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Used {selectedBalance?.usedDays ?? 0} of {selectedBalance?.daysAllowed ?? 0} days this year
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Start Date</span>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-pink-600 transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">End Date</span>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-pink-600 transition-all dark:text-white"
                      />
                    </div>
                  </div>
                  {selectedRangeDays > 0 && (
                    <p className={cn("text-xs font-bold", exceedsBalance ? "text-rose-500" : "text-emerald-600 dark:text-emerald-300")}>
                      Selected working days: {selectedRangeDays}
                    </p>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Core Reason</h2>
                  <textarea
                    rows={6}
                    placeholder="Please justify your leave request..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 rounded-2xl p-6 font-bold text-sm outline-none border-2 border-transparent focus:border-pink-600 transition-all resize-none dark:text-white"
                  />
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Task Handover</h2>
                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Select active tasks to hand over during leave and choose the teammate responsible for each task.
                    </p>
                  </div>

                  {activeTasks.length > 0 ? (
                    <div className="space-y-4">
                      <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.length > 0 && selectedTaskIds.length === allTaskIds.length}
                          onChange={toggleSelectAllTasks}
                          className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        Check All Options
                      </label>

                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                        {activeTasks.map((task) => {
                          const selected = selectedTaskSet.has(task.id);
                          return (
                            <div key={task.id} className="rounded-2xl border border-gray-100 dark:border-white/10 p-4 bg-gray-50 dark:bg-white/5">
                              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                                <label className="inline-flex items-center gap-3 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleTaskSelection(task.id)}
                                    className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{task.title}</p>
                                    <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 truncate">
                                      {task.projectTitle} • {task.status.replaceAll("_", " ")}
                                    </p>
                                  </div>
                                </label>

                                <select
                                  value={handoverDelegates[task.id] ?? ""}
                                  onChange={(e) =>
                                    setHandoverDelegates((prev) => ({
                                      ...prev,
                                      [task.id]: Number(e.target.value),
                                    }))
                                  }
                                  disabled={!selected}
                                  className="h-11 min-w-[220px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-3 text-xs font-bold text-gray-700 dark:text-zinc-300 disabled:opacity-50"
                                >
                                  <option value="">Choose teammate</option>
                                  {departmentMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                      {member.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5">
                      <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">
                        No active assigned tasks found. You can continue without a handover.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {wizardError ? <p className="mt-5 text-sm font-bold text-rose-500">{wizardError}</p> : null}

            <div className="mt-10 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-8">
              {currentStep > 1 ? (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="text-xs font-black uppercase text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={currentStep === 4 ? handleSubmit : nextStep}
                disabled={loading || !canProceedFromStep1 || (currentStep === 2 && exceedsBalance)}
                className="bg-[#111827] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white text-white dark:text-black px-10 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
              >
                {loading ? "..." : currentStep === 4 ? "Process Flow" : "Next Segment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditHandoverModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 transition-opacity" onClick={() => setShowEditHandoverModal(false)} />
          <div className="relative bg-white dark:bg-black rounded-[2rem] shadow-2xl w-full max-w-3xl p-8 border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Edit Task Handover</h3>
              <button
                onClick={() => setShowEditHandoverModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <Cancel01Icon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {activeTasks.length > 0 ? (
              <div className="space-y-4">
                <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={editSelectedTaskIds.length > 0 && editSelectedTaskIds.length === allTaskIds.length}
                    onChange={toggleEditSelectAllTasks}
                    className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  Check All Options
                </label>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {activeTasks.map((task) => {
                    const selected = editSelectedTaskIds.includes(task.id);
                    return (
                      <div key={task.id} className="rounded-2xl border border-gray-100 dark:border-white/10 p-4 bg-gray-50 dark:bg-white/5">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                          <label className="inline-flex items-center gap-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleEditTaskSelection(task.id)}
                              className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{task.title}</p>
                              <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 truncate">
                                {task.projectTitle} • {task.status.replaceAll("_", " ")}
                              </p>
                            </div>
                          </label>

                          <select
                            value={editHandoverDelegates[task.id] ?? ""}
                            onChange={(e) =>
                              setEditHandoverDelegates((prev) => ({
                                ...prev,
                                [task.id]: Number(e.target.value),
                              }))
                            }
                            disabled={!selected}
                            className="h-11 min-w-[220px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-3 text-xs font-bold text-gray-700 dark:text-zinc-300 disabled:opacity-50"
                          >
                            <option value="">Choose teammate</option>
                            {departmentMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5">
                <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">No active assigned tasks available to hand over.</p>
              </div>
            )}

            {wizardError ? <p className="mt-5 text-sm font-bold text-rose-500">{wizardError}</p> : null}

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditHandoverModal(false)}
                className="h-11 px-5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400"
              >
                Close
              </button>
              <button
                onClick={handleSaveEditedHandovers}
                disabled={handoverSaving}
                className="h-11 px-6 rounded-xl bg-[#111827] dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wider disabled:opacity-50"
              >
                {handoverSaving ? "Saving..." : "Save Handover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
