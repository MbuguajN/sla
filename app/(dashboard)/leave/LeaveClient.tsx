"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLeave, cancelLeave } from "@/app/actions/hrActions";
import {
  CalendarDays,
  Plus,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type LeaveItem = {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
};

interface Props {
  initialLeaves: LeaveItem[];
}

const leaveTypes = ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID", "COMPASSIONATE", "OTHER"];

export default function LeaveClient({ initialLeaves }: Props) {
  const router = useRouter();
  const [leaves] = useState(initialLeaves);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: "ANNUAL" as string,
    startDate: "",
    endDate: "",
    reason: "",
  });

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    DENIED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="h-4 w-4" />,
    APPROVED: <CheckCircle2 className="h-4 w-4" />,
    DENIED: <XCircle className="h-4 w-4" />,
    CANCELLED: <XCircle className="h-4 w-4" />,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createLeave({
        type: formData.type as "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY" | "UNPAID" | "COMPASSIONATE" | "OTHER",
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });
      setShowModal(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (leaveId: number) => {
    if (!confirm("Cancel this leave request?")) return;
    try {
      await cancelLeave(leaveId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel leave");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Leave</h1>
            <p className="text-sm text-gray-500">{leaves.length} requests</p>
          </div>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Request Leave
        </button>
      </div>

      {/* Leave Cards */}
      <div className="space-y-3">
        {leaves.map((leave) => (
          <div key={leave.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {leave.type} Leave
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[leave.status]}`}>
                      {statusIcons[leave.status]}
                      {leave.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                    <span className="text-gray-400 ml-2">({leave.totalDays} day{leave.totalDays > 1 ? "s" : ""})</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-2">{leave.reason}</p>
                  {leave.reviewNote && (
                    <p className="text-xs text-gray-400 mt-2 italic">Note: {leave.reviewNote}</p>
                  )}
                </div>
              </div>
              {leave.status === "PENDING" && (
                <button
                  onClick={() => handleCancel(leave.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}

        {leaves.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No leave requests</p>
            <p className="text-xs text-gray-400 mt-1">Submit a leave request to get started</p>
          </div>
        )}
      </div>

      {/* Leave Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Request Leave</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]">
                  {leaveTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea required value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41] resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg disabled:opacity-50">
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
