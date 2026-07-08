"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { reviewLeave } from "@/app/actions/hrActions";
import { Clock3, ArrowLeft } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  Textarea,
} from "@/components/daisy-components";
import { getLeaveDurationLabel, getLeaveTypeLabel } from "@/lib/leave";

type LeaveDetail = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  userDepartment: string | null;
  type: string;
  duration: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusLabel: Record<string, string> = {
  PENDING: "Pending Manager",
  PENDING_HR: "Pending HR",
  APPROVED: "Approved",
  DENIED: "Denied",
  CANCELLED: "Cancelled",
};

const statusColors: Record<string, string> = {
  PENDING: "warning",
  PENDING_HR: "info",
  APPROVED: "success",
  DENIED: "error",
  CANCELLED: "secondary",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function HRLeaveDetailClient({ leave }: { leave: LeaveDetail }) {
  const router = useRouter();
  const [status, setStatus] = useState(leave.status);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const canReview = leave.status === "PENDING_HR";
  const updatedDate = new Date(leave.updatedAt);
  const lastUpdatedLabel =
    Math.max(1, Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60))) + "h ago";

  const handleDecision = async (decision: "APPROVED" | "DENIED") => {
    if (decision === "DENIED" && !reviewNote.trim()) {
      alert("Please provide a reason when denying a leave request.");
      return;
    }
    setLoading(true);
    try {
      await reviewLeave(leave.id, decision, reviewNote.trim() || undefined);
      setStatus(decision);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 bg-[#f5f7fb] px-2 py-2 sm:px-0">
      <Link
        href="/hr/leaves"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#c91f41]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leave Requests
      </Link>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ffe8ec] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#cc1f45]">
              {getLeaveTypeLabel(leave.type)} ({getLeaveDurationLabel(leave.duration)})
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 border border-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {statusLabel[status] || status.replace("_", " ")}
            </span>
          </div>

          <h1 className="mt-3 text-[34px] leading-[1.08] font-black tracking-[-0.02em] text-[#0b2340]">{leave.userName}</h1>

          <div className="mt-10 space-y-8">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Employee</p>
              <p className="mt-1.5 text-[14px] font-medium text-[#0b2340]">{leave.userDepartment || "Unassigned"}</p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Leave Duration</p>
              <p className="mt-1.5 text-[14px] font-medium text-[#0b2340]">{leave.totalDays} working day{leave.totalDays !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-8">
          <Card className="rounded-2xl border border-slate-200/80 bg-[#f9fafc] shadow-none">
            <CardBody className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c91f41]">Leave Dates</p>
              <p className="mt-3 whitespace-pre-wrap text-[20px] leading-[1.35] text-[#233b57]">
                {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
              </p>
            </CardBody>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 bg-[#f9fafc] shadow-none">
            <CardBody className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c91f41]">Reason</p>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#233b57]">{leave.reason}</p>
            </CardBody>
          </Card>
        </div>
      </section>

      {canReview && (
        <Card className="rounded-2xl border border-slate-200/80 bg-[#f9fafc] shadow-none">
          <CardBody className="p-6 space-y-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c91f41]">HR Review Note</p>

            <Textarea
              rows={6}
              placeholder="Enter approval or denial reason..."
              value={reviewNote}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReviewNote(e.target.value)}
              className="h-[136px] w-full rounded-xl border-slate-200 bg-[#f4f6fb] !px-4 !py-3.5 text-[14px] leading-5 text-[#24344b] placeholder:text-[#93a1b7]"
            />

            <p className="-mt-3 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Required for denial</p>

            <div className="border-t border-slate-200 pt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-start gap-2 text-[11px] text-slate-500">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#dfe6f3] text-[10px] font-bold text-slate-700">
                  A
                </div>
                <div className="leading-tight">
                  <p>Last updated</p>
                  <p className="font-semibold text-slate-700">{lastUpdatedLabel}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  onClick={() => handleDecision("APPROVED")}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="!h-9 !min-h-9 !rounded-full !border-[#c8d8f4] !bg-[#e9f1ff] !px-4 !text-[13px] !font-bold !normal-case !leading-none !text-[#2a4f85] hover:!bg-[#dfeafd]"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => handleDecision("DENIED")}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="!h-9 !min-h-9 !rounded-full !border-[#cf2749] !bg-[#cf2749] !px-4 !text-[13px] !font-bold !normal-case !leading-none !text-white hover:!bg-[#b91d3d]"
                >
                  Deny
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {!canReview && leave.reviewNote && (
        <Card className="rounded-2xl border border-slate-200/80 bg-[#f9fafc] shadow-none">
          <CardBody className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c91f41]">HR Review Note</p>
            <p className="mt-3 text-[14px] leading-[1.6] text-[#233b57]">{leave.reviewNote}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
