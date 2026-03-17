"use client";

import { useState } from "react";
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
} from "@/app/actions/taskActions";
import {
  ArrowLeft,
  ListChecks,
  FolderKanban,
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Send,
  RotateCcw,
  Check,
  X,
  Plus,
  Trash2,
  User,
  Building2,
} from "lucide-react";

type Subtask = {
  id: number;
  title: string;
  status: string;
};

type Activity = {
  id: number;
  type: string;
  description: string;
  userName: string;
  createdAt: string;
  metadata: string | null;
};

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: number;
  projectTitle: string;
  clientName: string;
  deptId: number | null;
  departmentName: string | null;
  assignedUserId: number | null;
  assigneeName: string | null;
  createdById: number;
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

function calculateSLA(task: Task) {
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

export default function TaskDetailClient({ task: initialTask, currentUser, departmentMembers }: Props) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [loading, setLoading] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");

  const sla = calculateSLA(task);

  // Permission checks
  const isCreator = task.createdById === currentUser.id;
  const isAssignee = task.assignedUserId === currentUser.id;
  const isManager =
    currentUser.role === "MANAGER" && currentUser.departmentId === task.deptId;
  const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "CEO";

  const canAssign = isManager && ["UNASSIGNED", "ASSIGNED"].includes(task.status);
  const canConfirm = isAssignee && task.status === "ASSIGNED";
  const canStart = isAssignee && (task.status === "CONFIRMED" || task.status === "REVISION");
  const canPause = isAssignee && task.status === "IN_PROGRESS";
  const canResume = isAssignee && task.status === "PAUSED";
  const canSubmit = isAssignee && task.status === "IN_PROGRESS";
  const canRequestRevision = (isCreator || isAdmin) && task.status === "SUBMITTED";
  const canComplete = (isCreator || isAdmin) && task.status === "SUBMITTED";
  const canCancel = (isCreator || isAdmin) && !["DONE", "CANCELLED"].includes(task.status);

  const handleAction = async (
    action: () => Promise<unknown>,
    actionName: string
  ) => {
    setLoading(actionName);
    try {
      await action();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setLoading("addSubtask");
    try {
      await addSubtask(task.id, newSubtask);
      setNewSubtask("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add subtask");
    } finally {
      setLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    UNASSIGNED: "bg-gray-100 text-gray-700",
    ASSIGNED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-indigo-100 text-indigo-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    PAUSED: "bg-orange-100 text-orange-700",
    SUBMITTED: "bg-purple-100 text-purple-700",
    REVISION: "bg-red-100 text-red-700",
    DONE: "bg-green-100 text-green-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  const priorityColors: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-blue-100 text-blue-600",
    HIGH: "bg-orange-100 text-orange-600",
    URGENT: "bg-red-100 text-red-600",
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/tasks"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tasks
      </Link>

      {/* Task Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#fef2f4] flex items-center justify-center">
              <ListChecks className="h-6 w-6 text-[#c91f41]" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    statusColors[task.status]
                  }`}
                >
                  {task.status.replace("_", " ")}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    priorityColors[task.priority]
                  }`}
                >
                  {task.priority}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <Link
                  href={`/projects/${task.projectId}`}
                  className="flex items-center gap-1 hover:text-[#c91f41]"
                >
                  <FolderKanban className="h-4 w-4" />
                  {task.projectTitle}
                </Link>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {task.clientName}
                </span>
              </div>
            </div>
          </div>

          {/* SLA Badge */}
          <div className="text-right">
            {sla.status === "not_started" ? (
              <span className="text-sm text-gray-400">SLA not started</span>
            ) : sla.status === "completed" ? (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </span>
            ) : sla.status === "breached" ? (
              <span className="flex items-center gap-1 text-sm font-semibold text-red-600">
                <AlertTriangle className="h-4 w-4" />
                SLA Breached
              </span>
            ) : (
              <div>
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${
                    sla.status === "warning" ? "text-orange-600" : "text-gray-600"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  {formatRemaining(sla.remaining)} remaining
                </span>
                <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sla.status === "warning" ? "bg-orange-500" : "bg-[#c91f41]"
                    }`}
                    style={{ width: `${sla.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-100">
            {task.description}
          </p>
        )}

        {/* Task Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Department</p>
            <p className="text-sm font-medium text-gray-700 mt-1 flex items-center gap-1">
              <Building2 className="h-4 w-4 text-gray-400" />
              {task.departmentName || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Assignee</p>
            <p className="text-sm font-medium text-gray-700 mt-1 flex items-center gap-1">
              <User className="h-4 w-4 text-gray-400" />
              {task.assigneeName || "Unassigned"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Created by</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{task.creatorName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">SLA</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{task.slaHours}h</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-100">
          {canAssign && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors"
            >
              <User className="h-4 w-4" />
              Assign
            </button>
          )}

          {canConfirm && (
            <button
              onClick={() => handleAction(() => confirmTask(task.id), "confirm")}
              disabled={loading === "confirm"}
              className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {loading === "confirm" ? "Confirming..." : "Confirm Task"}
            </button>
          )}

          {canStart && (
            <button
              onClick={() => handleAction(() => startTask(task.id), "start")}
              disabled={loading === "start"}
              className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {loading === "start" ? "Starting..." : "Start Work"}
            </button>
          )}

          {canPause && (
            <button
              onClick={() => setShowPauseModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}

          {canResume && (
            <button
              onClick={() => handleAction(() => resumeTask(task.id), "resume")}
              disabled={loading === "resume"}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {loading === "resume" ? "Resuming..." : "Resume"}
            </button>
          )}

          {canSubmit && (
            <button
              onClick={() => handleAction(() => submitTask(task.id), "submit")}
              disabled={loading === "submit"}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {loading === "submit" ? "Submitting..." : "Submit for Review"}
            </button>
          )}

          {canRequestRevision && (
            <button
              onClick={() => setShowRevisionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Request Revision
            </button>
          )}

          {canComplete && (
            <button
              onClick={() => handleAction(() => completeTask(task.id), "complete")}
              disabled={loading === "complete"}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {loading === "complete" ? "Completing..." : "Mark as Done"}
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subtasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Subtasks</h2>

          {(isAssignee || isCreator) && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a subtask..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              />
              <button
                onClick={handleAddSubtask}
                disabled={loading === "addSubtask"}
                className="p-2 bg-[#c91f41] text-white rounded-lg hover:bg-[#a61835] transition-colors disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {task.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
              >
                <button
                  onClick={() =>
                    updateSubtaskStatus(
                      subtask.id,
                      subtask.status === "DONE" ? "PENDING" : "DONE"
                    ).then(() => router.refresh())
                  }
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    subtask.status === "DONE"
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300"
                  }`}
                >
                  {subtask.status === "DONE" && <Check className="h-3 w-3" />}
                </button>
                <span
                  className={`flex-1 text-sm ${
                    subtask.status === "DONE" ? "text-gray-400 line-through" : "text-gray-700"
                  }`}
                >
                  {subtask.title}
                </span>
                {(isAssignee || isCreator) && (
                  <button
                    onClick={() =>
                      deleteSubtask(subtask.id).then(() => router.refresh())
                    }
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {task.subtasks.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No subtasks</p>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Activity</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {task.activityLog.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Circle className="h-3 w-3 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{activity.userName}</span>{" "}
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {task.activityLog.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <Modal title="Assign Task" onClose={() => setShowAssignModal(false)}>
          <div className="space-y-3">
            {departmentMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  handleAction(() => assignTask(task.id, member.id), "assign");
                  setShowAssignModal(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#c91f41] hover:bg-[#fef2f4] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#fef2f4] flex items-center justify-center">
                  <span className="text-[#c91f41] text-sm font-semibold">
                    {member.name[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700">{member.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <ReasonModal
          title="Pause Task"
          placeholder="Reason for pausing..."
          buttonText="Pause Task"
          onClose={() => setShowPauseModal(false)}
          onSubmit={(reason) => {
            handleAction(() => pauseTask(task.id, reason), "pause");
            setShowPauseModal(false);
          }}
        />
      )}

      {/* Revision Modal */}
      {showRevisionModal && (
        <ReasonModal
          title="Request Revision"
          placeholder="What needs to be revised..."
          buttonText="Request Revision"
          onClose={() => setShowRevisionModal(false)}
          onSubmit={(reason) => {
            handleAction(() => requestRevision(task.id, reason), "revision");
            setShowRevisionModal(false);
          }}
        />
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <ReasonModal
          title="Cancel Task"
          placeholder="Reason for cancellation..."
          buttonText="Cancel Task"
          buttonColor="bg-red-500 hover:bg-red-600"
          onClose={() => setShowCancelModal(false)}
          onSubmit={(reason) => {
            handleAction(() => cancelTask(task.id, reason), "cancel");
            setShowCancelModal(false);
          }}
        />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ReasonModal({
  title,
  placeholder,
  buttonText,
  buttonColor = "bg-[#c91f41] hover:bg-[#a61835]",
  onClose,
  onSubmit,
}: {
  title: string;
  placeholder: string;
  buttonText: string;
  buttonColor?: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <Modal title={title} onClose={onClose}>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41] resize-none"
      />
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(reason)}
          disabled={!reason.trim()}
          className={`px-4 py-2 text-sm font-medium text-white ${buttonColor} rounded-lg transition-colors disabled:opacity-50`}
        >
          {buttonText}
        </button>
      </div>
    </Modal>
  );
}
