"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  assignTask,
  confirmTask,
  startTask,
  pauseTask,
  resumeTask,
  submitTask,
  requestRevision,
  completeTask,
  cancelTask,
  addSubtask,
  updateSubtaskStatus,
  deleteSubtask,
  addTaskComment,
  addTaskLink,
  deleteTaskLink,
} from "@/app/actions/taskActions";
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Plus,
  Trash2,
  Link2,
  ExternalLink,
  AtSign,
  Quote,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
} from "lucide-react";

type Subtask = {
  id: number;
  title: string;
  status: string;
  description?: string | null;
};

type TaskLink = {
  id: number;
  name: string;
  url: string;
};

type Activity = {
  id: number;
  type: string;
  description: string;
  userName: string;
  createdAt: string;
  metadata: string | null;
};

type ActivityMetadata = {
  kind?: "COMMENT" | "LINK";
  comment?: string;
  linkName?: string;
  linkUrl?: string;
};

type TimelineItem = Activity & {
  parsedMeta: ActivityMetadata;
};

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  briefReceivedAt: string | null;
  briefCategory: "SAFE" | "SAT" | null;
  projectId: number;
  projectTitle: string;
  clientName: string;
  deptId: number | null;
  departmentName: string | null;
  assignedUserId: number | null;
  assigneeName: string | null;
  createdById: number | null;
  creatorName: string;
  slaHours: number | null;
  slaStartedAt: string | null;
  slaPausedAt: string | null;
  slaPausedDuration: number | null;
  confirmedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  subtasks: Subtask[];
  links: TaskLink[];
  activityLog: Activity[];
};

type CurrentUser = {
  id: number;
  role: string;
  departmentId: number | null;
  departmentSlug: string | null;
};

interface Props {
  task: Task;
  currentUser: CurrentUser;
  departmentMembers: { id: number; name: string }[];
}

function calculateTaskProgress(task: Task) {
  if (task.status === "DONE") return { status: "completed", percentage: 100 };
  if (task.status === "CANCELLED") return { status: "cancelled", percentage: 0 };
  
  // Pre-start: zero until work begins
  if (["UNASSIGNED", "ASSIGNED", "CONFIRMED"].includes(task.status)) {
    return { status: "active", percentage: 0 };
  }

  // Submitted: jump to 80%
  if (task.status === "SUBMITTED") {
    return { status: "active", percentage: 80 };
  }

  // IN_PROGRESS / PAUSED / REVISION: 10% base + up to 70% from subtasks
  const base = 10;
  if (task.subtasks?.length > 0) {
    const done = task.subtasks.filter(s => s.status === "DONE").length;
    const subtaskContrib = Math.ceil((done / task.subtasks.length) * 70);
    return { status: "active", percentage: base + subtaskContrib };
  }

  return { status: "active", percentage: base };
}

function parseMetadata(raw: string | null): ActivityMetadata {
  if (!raw) return {};
  try { return JSON.parse(raw) as ActivityMetadata; } catch { return {}; }
}

export default function TaskDetailClient({ task: initialTask, currentUser, departmentMembers }: Props) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [loading, setLoading] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskDesc, setNewSubtaskDesc] = useState("");
  const [commentText, setCommentText] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => { setTask(initialTask); }, [initialTask]);
  useEffect(() => {
    const interval = setInterval(() => { router.refresh(); }, 15000);
    return () => clearInterval(interval);
  }, [router]);

  const progress = calculateTaskProgress(task);

  const isCreator = task.createdById === currentUser.id;
  const isAssignee = task.assignedUserId === currentUser.id;
  const isManager = currentUser.role === "MANAGER" && currentUser.departmentId === task.deptId;
  const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "CEO";
  const isInitiatorInAllowedDept = isCreator && (currentUser.departmentSlug === "client-service" || currentUser.departmentSlug === "business-development");
  
  const isTaskClosed = task.status === "DONE" || task.status === "CANCELLED";

  const canAddLink = isCreator && !isTaskClosed; 
  const canAddSubtask = isInitiatorInAllowedDept && !isTaskClosed;
  const canToggleSubtaskDone = isAssignee && !isTaskClosed;
  const canDeleteSubtask = (isInitiatorInAllowedDept || isAdmin || isManager) && !isTaskClosed;
  const canPostUpdate = !isTaskClosed;

  const canAssign = isManager && task.status === "UNASSIGNED";
  const canReassign = isManager && task.status === "ASSIGNED";
  const canConfirm = isAssignee && task.status === "ASSIGNED";
  const canStart = isAssignee && (task.status === "CONFIRMED" || task.status === "REVISION");
  const canPause = isAssignee && task.status === "IN_PROGRESS";
  const canResume = isAssignee && task.status === "PAUSED";
  const hasAllSubtasksDone = !task.subtasks || task.subtasks.length === 0 || task.subtasks.every(s => s.status === "DONE");
  const canSubmit = isAssignee && task.status === "IN_PROGRESS" && hasAllSubtasksDone;
  const canRequestRevision = (isCreator || isAdmin) && task.status === "SUBMITTED";
  const canComplete = (isCreator || isAdmin) && task.status === "SUBMITTED";
  const canCancel = (isCreator || isAdmin) && !["DONE", "CANCELLED"].includes(task.status);

  const timeline = useMemo<TimelineItem[]>(
    () => task.activityLog.map((item) => ({ ...item, parsedMeta: parseMetadata(item.metadata) })),
    [task.activityLog]
  );

  const handleAction = async <T extends { status?: string },>(
    action: () => Promise<T>,
    actionName: string,
    optimisticUpdate?: (prev: Task) => Task
  ) => {
    setLoading(actionName);
    try {
      if (optimisticUpdate) setTask((prev) => optimisticUpdate(prev));
      const result = await action();
      if (result && typeof result.status === "string") {
        setTask((prev) => ({
          ...prev,
          status: result.status || prev.status,
          confirmedAt: result.status === "CONFIRMED" && !prev.confirmedAt ? new Date().toISOString() : prev.confirmedAt,
          submittedAt: result.status === "SUBMITTED" && !prev.submittedAt ? new Date().toISOString() : prev.submittedAt,
          completedAt: result.status === "DONE" && !prev.completedAt ? new Date().toISOString() : prev.completedAt,
          slaPausedAt: result.status === "PAUSED" ? new Date().toISOString() : prev.slaPausedAt,
        }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
      router.refresh();
    } finally { setLoading(null); }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    const draftDescription = newSubtaskDesc.trim() || null;
    setLoading("addSubtask");
    try {
      const created = await addSubtask(task.id, newSubtask.trim(), draftDescription || undefined);
      setTask((prev) => ({
        ...prev,
        // If task was SUBMITTED, server reverted it to IN_PROGRESS
        status: prev.status === "SUBMITTED" ? "IN_PROGRESS" : prev.status,
        subtasks: [...prev.subtasks, { id: created.id, title: created.title, status: created.status, description: draftDescription }],
      }));
      setNewSubtask("");
      setNewSubtaskDesc("");
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to add subtask"); }
    finally { setLoading(null); }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setLoading("comment");
    try {
      const created = await addTaskComment(task.id, commentText.trim());
      setTask((prev) => ({ ...prev, activityLog: [created, ...prev.activityLog] }));
      setCommentText("");
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to post comment"); }
    finally { setLoading(null); }
  };

  const handleAddLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    setLoading("addLink");
    try {
      const created = await addTaskLink(task.id, linkName.trim(), linkUrl.trim());
      setTask((prev) => ({ ...prev, links: [...prev.links, created] }));
      setLinkName("");
      setLinkUrl("");
      setShowLinkModal(false);
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to add link"); }
    finally { setLoading(null); }
  };

  const handleDeleteLink = async (linkId: number) => {
    if (!confirm("Are you sure you want to remove this link?")) return;
    setLoading(`deleteLink-${linkId}`);
    try {
      await deleteTaskLink(linkId);
      setTask(prev => ({ ...prev, links: prev.links.filter(l => l.id !== linkId) }));
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to delete link"); }
    finally { setLoading(null); }
  };

  const isHighPriority = task.priority === "HIGH";
  const briefLabel = task.briefCategory === "SAT" ? "SAT BRIEF" : task.briefCategory === "SAFE" ? "SAFE BRIEF" : "NO BRIEF DATE";
  const briefClassName =
    task.briefCategory === "SAT"
      ? "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-500/30"
      : task.briefCategory === "SAFE"
      ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/30"
      : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-500 border border-slate-200 dark:border-white/10";

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 p-6 md:p-8 bg-white dark:bg-[#0b0b0f] min-h-screen text-[#0f172a] dark:text-zinc-100 antialiased">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 border-b border-gray-100 dark:border-white/10 pb-8">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
             <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isHighPriority ? "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-500/30" : "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30"}`}>
               {task.priority} PRIORITY
             </span>
             <span className="text-gray-300 dark:text-zinc-600 text-[10px] font-bold uppercase tracking-wider">•</span>
             <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${briefClassName}`}>
               {briefLabel}
             </span>
             <span className="text-gray-300 dark:text-zinc-600 text-[10px] font-bold uppercase tracking-wider">•</span>
             <span className="text-gray-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">TASK #{task.id}</span>
          </div>
          <h1 className="text-[22px] md:text-[29px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {task.title}
          </h1>
        </div>

        <div className="flex flex-col items-end gap-3 min-w-[300px]">
          <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">TASK PROGRESS</span>
              <span className="text-[14px] font-black text-slate-900 dark:text-white leading-none">{Math.round(progress.percentage)}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-in-out ${progress.status === "completed" ? "bg-emerald-500" : "bg-[#c91f41]"}`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
          
          <div className="flex gap-2 w-full">
            {canPause && (
              <button 
                onClick={() => setShowPauseModal(true)}
                className="flex-1 h-[44px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300 rounded-lg font-bold text-[11px] uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/20 transition-colors border border-slate-200 dark:border-white/10"
              >
                PAUSE TASK
              </button>
            )}
            {(canStart || canResume || canConfirm || canSubmit || canComplete) && (
              <button 
                onClick={() => {
                  if (canConfirm) handleAction(() => confirmTask(task.id), "confirm");
                  else if (canStart) handleAction(() => startTask(task.id), "start");
                  else if (canResume) handleAction(() => resumeTask(task.id), "resume");
                  else if (canSubmit) handleAction(() => submitTask(task.id), "submit");
                  else if (canComplete) handleAction(() => completeTask(task.id), "complete");
                }}
                className="flex-1 h-[44px] bg-[#c91f41] text-white rounded-lg font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#a61835] transition-all shadow-md active:scale-95"
              >
                {canComplete ? "COMPLETE" : canSubmit ? "SUBMIT" : canStart ? "START" : canConfirm ? "CONFIRM" : "RESUME"}
                {canComplete && <Check className="h-3.5 w-3.5" strokeWidth={4} />}
              </button>
            )}
            {(canAssign || canReassign) && (
              <button onClick={() => setShowAssignModal(true)} className="flex-1 h-[44px] bg-indigo-600 text-white rounded-lg font-bold text-[11px] uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                {canReassign ? "REASSIGN" : "ASSIGN"}
              </button>
            )}
            {isAssignee && task.status === "IN_PROGRESS" && !hasAllSubtasksDone && (
              <div className="flex-1 h-[44px] bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-zinc-500 rounded-lg font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10 cursor-not-allowed" title="Complete all subtasks before submitting">
                SUBMIT
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-[4px] h-4 bg-[#c91f41] rounded-full" />
              <h2 className="text-[11px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Description</h2>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl p-6">
              <p className="text-[16px] text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">
                {task.description || "The task initiator has not provided a detailed description."}
              </p>
              <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 text-center">DEADLINE</p>
                  <p className="text-[14px] font-bold text-slate-900 dark:text-white text-center">
                    {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 text-center">ASSIGNED TO</p>
                  <p className="text-[14px] font-bold text-slate-900 dark:text-white text-center truncate">{task.assigneeName || "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 text-center">DEPARTMENT</p>
                  <p className="text-[14px] font-bold text-slate-900 dark:text-white text-center truncate">{task.departmentName || "General"}</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-[4px] h-4 bg-[#c91f41] rounded-full" />
              <h2 className="text-[11px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Resources & Links</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {task.links?.map((link) => (
                <div key={link.id} className="group bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/25 hover:shadow-sm h-[72px] rounded-xl p-3 flex items-center gap-3 transition-all">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-red-50 dark:group-hover:bg-red-500/15 group-hover:border-red-100 dark:group-hover:border-red-500/30 transition-colors">
                    <Link2 className="h-5 w-5 text-slate-500 dark:text-zinc-400 group-hover:text-red-500 dark:group-hover:text-red-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate tracking-tight">{link.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">EXTERNAL RESOURCE</p>
                  </div>
                  <div className="flex items-center">
                    <a href={link.url} target="_blank" className="p-2 text-slate-300 dark:text-zinc-500 hover:text-[#c91f41] transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {canAddLink && (
                      <button onClick={() => handleDeleteLink(link.id)} className="p-2 text-slate-200 dark:text-zinc-600 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {canAddLink && (
                <button 
                  onClick={() => setShowLinkModal(true)}
                  className="h-[72px] rounded-xl border-2 border-dashed border-slate-200 dark:border-white/15 flex items-center gap-3 group hover:border-slate-400 dark:hover:border-white/25 hover:bg-slate-50 dark:hover:bg-white/5 transition-all px-4"
                >
                  <div className="w-10 h-10 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white/10 transition-colors">
                    <Plus className="h-4 w-4 text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest group-hover:text-slate-600 dark:group-hover:text-zinc-300">
                    ADD LINK
                  </span>
                </button>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-[4px] h-4 bg-[#c91f41] rounded-full" />
                <h2 className="text-[11px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Subtasks</h2>
              </div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                {task.subtasks?.filter(s => s.status === "DONE").length || 0} / {task.subtasks?.length || 0} SUBTASKS DONE
              </span>
            </div>
            <div className="space-y-3">
              {task.subtasks?.map((sub) => {
                const isDone = sub.status === "DONE";
                return (
                  <div key={sub.id} className={`bg-white dark:bg-white/5 rounded-xl border p-5 transition-all ${isDone ? "border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5" : "border-slate-200 dark:border-white/15 shadow-sm"}`}>
                    <div className="flex items-center gap-4">
                      <button 
                         onClick={() => updateSubtaskStatus(sub.id, isDone ? "PENDING" : "DONE").then(res => setTask(p => ({ ...p, subtasks: p.subtasks.map(s => s.id === res.id ? { ...s, status: res.status } : s) })))}
                         disabled={!canToggleSubtaskDone}
                         className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all flex-shrink-0 ${isDone ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-white/10 border-slate-200 dark:border-white/20 hover:border-[#c91f41]"}`}
                      >
                        {isDone && <Check className="h-3.5 w-3.5" strokeWidth={4} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-bold tracking-tight ${isDone ? "text-slate-300 dark:text-zinc-500 line-through" : "text-slate-900 dark:text-white"}`}>
                          {sub.title}
                        </p>
                        {sub.description && (
                          <p className={`mt-1 text-[12px] leading-relaxed ${isDone ? "text-slate-300 dark:text-zinc-500" : "text-slate-500 dark:text-zinc-400"}`}>
                            {sub.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {canDeleteSubtask && <button onClick={() => deleteSubtask(sub.id).then(() => setTask(p => ({...p, subtasks: p.subtasks.filter(s => s.id !== sub.id)})))} className="text-slate-300 dark:text-zinc-500 hover:text-red-500 transition-colors flex-shrink-0"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {canAddSubtask && (
                <div className="mt-4 space-y-2">
                  <div className="flex gap-3">
                    <div className="flex-1 h-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/15 rounded-xl flex items-center gap-3 px-4 focus-within:border-slate-400 dark:focus-within:border-white/30 focus-within:ring-2 focus-within:ring-slate-50 dark:focus-within:ring-white/10 transition-all">
                      <Plus className="h-4 w-4 text-[#c91f41] flex-shrink-0" strokeWidth={3} />
                      <input 
                        type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddSubtask()}
                        placeholder="Add a milestone step..."
                        className="flex-1 bg-transparent border-none p-0 text-[14px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:ring-0"
                      />
                    </div>
                    <button onClick={handleAddSubtask} disabled={loading === "addSubtask"} className="h-12 px-6 bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-60">ADD</button>
                  </div>
                  <textarea
                    value={newSubtaskDesc}
                    onChange={e => setNewSubtaskDesc(e.target.value)}
                    placeholder="Add a description (optional)"
                    rows={2}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/15 rounded-xl px-4 py-3 text-[13px] text-slate-700 dark:text-zinc-300 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-slate-50 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white/30 transition-all resize-none"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-[4px] h-4 bg-[#c91f41] rounded-full" />
              <h2 className="text-[11px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Progress activity</h2>
            </div>
            <div className="relative pl-7 space-y-6">
              <div className="absolute left-[3px] top-2 bottom-2 w-[1.5px] bg-slate-100 dark:bg-white/10" />
              {timeline?.slice(0, 4).map((act, idx) => {
                const iL = idx === 0;
                return (
                  <div key={act.id} className="relative group">
                    <div className={`absolute -left-[31px] top-1 w-5 h-5 rounded-full bg-white dark:bg-[#0f0f14] border-2 flex items-center justify-center z-10 ${iL ? "border-[#c91f41]" : "border-slate-200 dark:border-white/20"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${iL ? "bg-[#c91f41]" : "bg-slate-300 dark:bg-zinc-500"}`} />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-slate-900 dark:text-white">{act.userName}</span>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">{act.description}</span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-300 dark:text-zinc-500 uppercase tracking-tighter">
                        {new Date(act.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {new Date(act.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {act.parsedMeta.kind === "COMMENT" && (
                        <div className="mt-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-2.5">
                          <p className="text-[12px] text-slate-600 dark:text-zinc-300 leading-normal font-medium italic">"{act.parsedMeta.comment}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="sticky top-6 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/15 shadow-xl p-6 flex flex-col gap-4 ring-1 ring-black/5 dark:ring-white/10">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2">Internal Status Update</h3>
            {canPostUpdate ? (
              <textarea 
                 value={commentText} onChange={e => setCommentText(e.target.value)}
                 placeholder="Write your update here... "
                 className="w-full resize-none border-none p-0 text-[14px] font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-300 dark:placeholder:text-zinc-500 focus:ring-0 min-h-[100px] bg-transparent"
              />
            ) : (
              <div className="min-h-[100px] flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/15">
                <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Post updates disabled for closed tasks</p>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4">
              <div className="flex items-center gap-4">
                 {canAddLink && <button onClick={() => setShowLinkModal(true)} title="Add Link" className="p-2 text-slate-300 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/10 rounded-lg transition-all"><Link2 className="h-4 w-4"/></button>}
                 <button className="p-2 text-slate-300 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/10 rounded-lg transition-all"><AtSign className="h-4 w-4"/></button>
              </div>
              {canPostUpdate && (
                <button 
                  onClick={handlePostComment}
                  disabled={loading === "comment" || !commentText.trim()}
                  className="h-[38px] px-6 bg-[#c91f41] text-white rounded-lg font-bold text-[11px] uppercase tracking-wider hover:bg-[#a61835] transition-all disabled:opacity-50 shadow-sm"
                >
                  POST UPDATE
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {showLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 transition-opacity" onClick={() => setShowLinkModal(false)} />
          <div className="relative bg-white dark:bg-[#111111] rounded-3xl shadow-2xl w-full max-w-md p-10 ring-1 ring-black/10 dark:ring-white/10 border border-transparent dark:border-white/10">
            <h2 className="text-[20px] font-black text-slate-900 dark:text-white mb-8 tracking-tight text-center uppercase">Add Resource Link</h2>
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">LINK NAME</label>
                  <input 
                    type="text" value={linkName} onChange={e => setLinkName(e.target.value)}
                    placeholder="e.g. Project Brief, Figma File..."
                    className="w-full h-12 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 text-[14px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-[#c91f41]/10 focus:border-[#c91f41] transition-all"
                  />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">URL</label>
                  <input 
                    type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-12 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 text-[14px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-[#c91f41]/10 focus:border-[#c91f41] transition-all"
                  />
               </div>
               <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowLinkModal(false)} className="flex-1 h-12 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">CANCEL</button>
                  <button onClick={handleAddLink} disabled={!linkName || !linkUrl} className="flex-1 h-12 bg-[#c91f41] text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-[#a61835] transition-colors disabled:opacity-50">ADD LINK</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 transition-opacity" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-white dark:bg-[#111111] rounded-3xl shadow-2xl w-full max-w-md p-10 ring-1 ring-black/10 dark:ring-white/10 border border-transparent dark:border-white/10">
            <h2 className="text-[20px] font-black text-slate-900 dark:text-white mb-8 tracking-tight text-center uppercase">{canReassign ? "RE-ASSIGN TASK" : "ASSIGN TASK"}</h2>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {departmentMembers?.map(m => (
                <button 
                  key={m.id} onClick={() => { handleAction(() => assignTask(task.id, m.id), "assign"); setShowAssignModal(false); }}
                  className="w-full h-16 px-6 rounded-2xl border border-slate-100 dark:border-white/10 hover:border-indigo-100 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all text-left flex items-center gap-4 group"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-slate-500 dark:text-zinc-300 text-[11px] group-hover:bg-indigo-600 group-hover:text-white transition-all ring-1 ring-black/5 dark:ring-white/10">{m.name[0]}</div>
                  <span className="text-[15px] font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPauseModal && (
        <ReasonModal title="PAUSE REASON" placeholder="Please explain why work is pausing..." buttonText="PAUSE TASK" onClose={() => setShowPauseModal(false)} onSubmit={r => { handleAction(() => pauseTask(task.id, r), "pause"); setShowPauseModal(false); }} />
      )}
    </div>
  );
}

function ReasonModal({ title, placeholder, buttonText, onClose, onSubmit }: { title: string, placeholder: string, buttonText: string, onClose: () => void, onSubmit: (r: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#111111] rounded-3xl shadow-2xl w-full max-w-md p-10 border border-transparent dark:border-white/10">
        <h2 className="text-[20px] font-black text-slate-900 dark:text-white mb-8 tracking-tight text-center uppercase">{title}</h2>
        <textarea 
          value={reason} onChange={e => setReason(e.target.value)} rows={5} placeholder={placeholder} 
          className="w-full bg-slate-50 dark:bg-black border border-slate-100 dark:border-white/10 rounded-2xl p-6 text-[14px] font-medium text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-slate-100 dark:focus:ring-white/10 mb-8 resize-none" 
        />
        <div className="grid grid-cols-2 gap-4">
          <button onClick={onClose} className="h-14 font-bold text-[11px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-zinc-300 transition-colors">CANCEL</button>
          <button onClick={() => onSubmit(reason)} disabled={!reason.trim()} className="h-14 bg-[#c91f41] text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-red-100/70 dark:shadow-red-500/20 disabled:opacity-50 hover:bg-[#a61835] transition-all">{buttonText}</button>
        </div>
      </div>
    </div>
  );
}
