"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { reviewLeave } from "@/app/actions/hrActions";
import {
  ArrowLeft01Icon,
  Calendar01Icon,
  UserCircleIcon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  NoteIcon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

type LeaveDetail = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  userDepartment: string | null;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  DENIED: "bg-rose-50 text-rose-700 border border-rose-100",
  CANCELLED: "bg-slate-100 text-slate-500 border border-slate-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function HRLeaveDetailClient({ leave }: { leave: LeaveDetail }) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState<"APPROVED" | "DENIED" | null>(null);

  const canReview = leave.status === "PENDING";

  const handleDecision = async (decision: "APPROVED" | "DENIED") => {
    if (decision === "DENIED" && !reviewNote.trim()) {
      alert("Please provide a reason when denying a leave request.");
      return;
    }
    setLoading(decision);
    try {
      await reviewLeave(leave.id, decision, reviewNote.trim() || undefined);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Back */}
      <Link
        href="/hr/leaves"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#c91f41] transition-colors"
      >
        <ArrowLeft01Icon className="h-4 w-4" />
        Back to All Leaves
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
            <span className="text-lg font-black text-rose-500">
              {getInitials(leave.userName)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {leave.userName}
            </h1>
            <p className="text-sm text-slate-500">
              {leave.userDepartment || "Unassigned"} &middot;{" "}
              {leave.userRole.charAt(0) + leave.userRole.slice(1).toLowerCase()}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest",
            STATUS_STYLES[leave.status] || "bg-slate-100 text-slate-500"
          )}
        >
          {leave.status}
        </span>
      </div>

      {/* Leave info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Type
          </p>
          <p className="text-sm font-black text-slate-800 capitalize">
            {leave.type.toLowerCase()}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Start Date
          </p>
          <p className="text-sm font-black text-slate-800">{formatDate(leave.startDate)}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            End Date
          </p>
          <p className="text-sm font-black text-slate-800">{formatDate(leave.endDate)}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Working Days
          </p>
          <p className="text-sm font-black text-slate-800">{leave.totalDays} day{leave.totalDays !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Reason */}
      <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <NoteIcon className="h-4 w-4 text-slate-400" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Reason
          </p>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{leave.reason}</p>
      </div>

      {/* Review note (if already reviewed) */}
      {leave.reviewNote && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            HR Review Note
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{leave.reviewNote}</p>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-6 text-xs text-slate-400 font-medium">
        <span className="flex items-center gap-1.5">
          <Clock01Icon className="h-3.5 w-3.5" />
          Submitted {formatDateTime(leave.createdAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar01Icon className="h-3.5 w-3.5" />
          Updated {formatDateTime(leave.updatedAt)}
        </span>
      </div>

      {/* Actions */}
      {canReview && (
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm space-y-4">
          <p className="text-sm font-black text-slate-800">Review Decision</p>
          <p className="text-xs text-slate-400">
            A denial requires a review note. Approval note is optional.
          </p>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Add a note (required for denial)..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#c91f41] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/10 resize-none transition"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDecision("APPROVED")}
              disabled={!!loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              <CheckmarkCircle01Icon className="h-4 w-4" />
              {loading === "APPROVED" ? "Approving..." : "Approve"}
            </button>
            <button
              onClick={() => handleDecision("DENIED")}
              disabled={!!loading}
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-black text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-all"
            >
              <Cancel01Icon className="h-4 w-4" />
              {loading === "DENIED" ? "Denying..." : "Deny"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
