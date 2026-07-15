"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createLeave, cancelLeave, updateLeaveHandovers } from "@/app/actions/hrActions";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Calendar01Icon,
  Add01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  NoteIcon,
} from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { getLeaveDayFactor, getLeaveTimeWindow, getLeaveTypeLabel } from "@/lib/leave";
import { getLeaveDurationLabel } from "@/lib/leave";

type LeaveRequest = {
  id: number;
  type: string;
  duration: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string;
  reviewNote?: string | null;
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

const formatTypeLabel = (value: string) => getLeaveTypeLabel(value);
const formatDurationLabel = (value: string) => getLeaveDurationLabel(value);
const formatLeaveRequestLabel = (type: string, duration: string) => `${getLeaveTypeLabel(type)} (${getLeaveDurationLabel(duration)})`;
const supportsHalfDayType = (type: string) => type === "ANNUAL_LEAVE" || type === "SICKNESS_LEAVE";

const formatLeaveDays = (value: number) => {
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(1);
};

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
    duration: "FULL_DAY",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [handoverDelegates, setHandoverDelegates] = useState<Record<number, number>>({});
  const [editSelectedTaskIds, setEditSelectedTaskIds] = useState<number[]>([]);
  const [editHandoverDelegates, setEditHandoverDelegates] = useState<Record<number, number>>({});
  const [wizardError, setWizardError] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    const factor = getLeaveDayFactor(formData.duration);
    const cursor = new Date(start);

    while (cursor <= end) {
      const day = cursor.getDay();
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
      if (day !== 0 && day !== 6 && !holidaySet.has(key)) {
        totalDays += factor;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return totalDays;
  }, [formData.startDate, formData.endDate, formData.duration, holidaySet]);

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
      duration: "FULL_DAY",
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
        duration: formData.duration as any,
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

  const filteredAndPaginatedLeaves = useMemo(() => {
    let filtered = initialLeaves.filter((item) => {
      const matchesSearch =
        item.type.toLowerCase().includes(tableSearch.toLowerCase()) ||
        item.reason.toLowerCase().includes(tableSearch.toLowerCase()) ||
        item.status.toLowerCase().includes(tableSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (filterFromDate || filterToDate) {
        const itemStart = new Date(item.startDate).getTime();
        const itemEnd = new Date(item.endDate).getTime();
        const fromTime = filterFromDate ? new Date(filterFromDate).getTime() : 0;
        const toTime = filterToDate
          ? new Date(new Date(filterToDate).getTime() + 86400000).getTime()
          : Infinity;

        if (itemEnd < fromTime || itemStart > toTime) return false;
      }

      return true;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const safePage = Math.min(currentPage, Math.max(1, totalPages));
    const start = (safePage - 1) * itemsPerPage;

    return {
      items: filtered.slice(start, start + itemsPerPage),
      total: filtered.length,
      currentPage: safePage,
      totalPages,
    };
  }, [initialLeaves, tableSearch, filterFromDate, filterToDate, currentPage]);

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

      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black/40 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
            {filteredAndPaginatedLeaves.total} request{filteredAndPaginatedLeaves.total !== 1 ? "s" : ""} (showing {filteredAndPaginatedLeaves.items.length})
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Search type, reason, status..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="col-span-1 md:col-span-2 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => {
                setFilterFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => {
                setFilterToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
          {filteredAndPaginatedLeaves.items.length > 0 ? (
            <table className="w-full min-w-[640px]">
              <thead className="sticky top-0 bg-white dark:bg-black/40 z-10">
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
                {filteredAndPaginatedLeaves.items.map((item) => {
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
                    PENDING_HR:
                      "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
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
                          {formatLeaveRequestLabel(item.type, item.duration)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-zinc-200">{start.toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-zinc-200">{end.toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{formatLeaveDays(item.totalDays)}d</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-zinc-400 max-w-[220px] truncate">{item.reason || "-"}</td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block group">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full cursor-help ${statusColors[item.status] ?? "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-300"}`}
                          >
                            {item.status === "PENDING_HR" ? "PENDING HR" : item.status}
                          </span>
                          {item.reviewNote && (
                            <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs px-3 py-2 rounded-lg whitespace-nowrap font-semibold max-w-xs before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-900 dark:before:border-t-slate-100">
                              {item.reviewNote}
                            </div>
                          )}
                        </div>
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
                          {["PENDING", "PENDING_HR"].includes(item.status) ? (
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

        {filteredAndPaginatedLeaves.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              Page {filteredAndPaginatedLeaves.currentPage} of {filteredAndPaginatedLeaves.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={filteredAndPaginatedLeaves.currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/10 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(filteredAndPaginatedLeaves.totalPages, p + 1))}
                disabled={filteredAndPaginatedLeaves.currentPage === filteredAndPaginatedLeaves.totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/10 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 transition-opacity" onClick={closeModal} />
          <div className="relative bg-white dark:bg-black rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-5 border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
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

            <div className="min-h-[250px] flex flex-col justify-center">
              {currentStep === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Select Nature</h2>
                  {availableLeaveTypes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {availableLeaveTypes.map((type) => {
                        const isActive = formData.type === type;
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                type,
                                duration: supportsHalfDayType(type) ? prev.duration : "FULL_DAY",
                              }));
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
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Duration</h2>
                  <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Selected Leave Balance</p>
                    <p className="mt-2 text-sm font-extrabold text-gray-800 dark:text-zinc-200">
                      {formatTypeLabel(formData.type)}: {formatLeaveDays(selectedBalance?.remainingDays ?? 0)} day(s) remaining
                    </p>
                    <div className="mt-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Duration Type</label>
                      <select
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        disabled={!supportsHalfDayType(formData.type)}
                        className="mt-1 h-11 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] px-3 text-xs font-bold text-gray-700 dark:text-zinc-300"
                      >
                        <option value="FULL_DAY" className="bg-white dark:bg-[#111111]">{formatDurationLabel("FULL_DAY")}</option>
                        {supportsHalfDayType(formData.type) ? (
                          <>
                            <option value="HALF_DAY_MORNING" className="bg-white dark:bg-[#111111]">{formatDurationLabel("HALF_DAY_MORNING")}</option>
                            <option value="HALF_DAY_AFTERNOON" className="bg-white dark:bg-[#111111]">{formatDurationLabel("HALF_DAY_AFTERNOON")}</option>
                          </>
                        ) : null}
                      </select>
                      {!supportsHalfDayType(formData.type) ? (
                        <p className="mt-1 text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
                          Half-day selection is available only for annual and sickness leave.
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Used {formatLeaveDays(selectedBalance?.usedDays ?? 0)} of {formatLeaveDays(selectedBalance?.daysAllowed ?? 0)} days this year
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Time window: {(() => {
                        const window = getLeaveTimeWindow(formData.duration);
                        return `${window.startHour}:00 - ${window.endHour}:00`;
                      })()}
                    </p>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Start Date</span>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-pink-600 transition-all text-gray-700 dark:text-white [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">End Date</span>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-pink-600 transition-all text-gray-700 dark:text-white [color-scheme:dark]"
                      />
                    </div>
                  </div>
                  {selectedRangeDays > 0 && (
                    <p className={cn("text-xs font-bold", exceedsBalance ? "text-rose-500" : "text-emerald-600 dark:text-emerald-300")}>
                      Selected working days: {formatLeaveDays(selectedRangeDays)}
                    </p>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Core Reason</h2>
                  <RichTextEditor
                    value={formData.reason}
                    onChange={(val) => setFormData({ ...formData, reason: val })}
                    placeholder="Please justify your leave request..."
                    height={200}
                  />
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
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
                          className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-pink-600 focus:ring-pink-500 bg-white dark:bg-[#111111]"
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
                                    className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-pink-600 focus:ring-pink-500 bg-white dark:bg-[#111111]"
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
                                  className="h-11 min-w-[220px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] px-3 text-xs font-bold text-gray-700 dark:text-zinc-300 disabled:opacity-50"
                                >
                                  <option value="" className="bg-white dark:bg-[#111111]">Choose teammate</option>
                                  {departmentMembers.map((member) => (
                                    <option key={member.id} value={member.id} className="bg-white dark:bg-[#111111]">
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

            {wizardError ? <p className="mt-4 text-sm font-bold text-rose-500">{wizardError}</p> : null}

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-5">
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
