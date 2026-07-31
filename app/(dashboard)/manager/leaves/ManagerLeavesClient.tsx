"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CalendarDays, Search } from "lucide-react";
import {
  Card,
  CardBody,
  Badge,
  Button,
  Input,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/daisy-components";
import { getLeaveDurationLabel, getLeaveTypeLabel } from "@/lib/leave";
import { reviewLeave } from "@/app/actions/hrActions";

type LeaveItem = {
  id: number;
  userId: number;
  userName: string;
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
};

interface Props {
  initialLeaves: LeaveItem[];
}

export default function ManagerLeavesClient({ initialLeaves }: Props) {
  const router = useRouter();
  const [leaves, setLeaves] = useState(initialLeaves);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = leaves.filter((l) => {
    const matchSearch = l.userName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = ["ALL", "PENDING", "PENDING_HR", "APPROVED", "DENIED"];

  const statusToBadgeVariant: Record<string, string> = {
    PENDING: "warning",
    PENDING_HR: "info",
    APPROVED: "success",
    DENIED: "error",
    CANCELLED: "secondary",
  };

  const handleDecision = async (leaveId: number, decision: "APPROVED" | "DENIED") => {
    if (decision === "DENIED" && !reviewNote.trim()) {
      alert("Please provide a reason when denying a leave request.");
      return;
    }
    setLoading(true);
    try {
      const result = await reviewLeave(leaveId, decision, reviewNote.trim() || undefined);
      if (result && !result.ok) {
        alert(result.error || "Action failed");
        return;
      }
      setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: decision === "APPROVED" ? "PENDING_HR" : "DENIED" } : l));
      setReviewNote("");
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-[#fef2f4] dark:bg-[#c91f41]/10 rounded-xl">
              <CalendarDays className="h-4 w-4 text-[#c91f41]" />
            </div>
            <span className="text-[11px] font-black text-[#c91f41] uppercase tracking-[0.2em]">Manager Desk</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">Team Leave Requests</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">Review and forward leave requests from your team members.</p>
        </div>
        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Pending Review</p>
            <p className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mt-2">{leaves.filter((l) => l.status === "PENDING").length}</p>
          </div>
          <div className="rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Forwarded to HR</p>
            <p className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mt-2">{leaves.filter((l) => l.status === "PENDING_HR").length}</p>
          </div>
          <div className="rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Approved / Denied</p>
            <p className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mt-2">{leaves.filter((l) => l.status === "APPROVED" || l.status === "DENIED").length}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black/40 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by employee name"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl border-gray-200 bg-white dark:bg-black dark:border-white/10 dark:text-zinc-100"
            />
          </div>
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl bg-gray-50 dark:bg-white/5 p-1.5 border border-gray-100 dark:border-white/10">
            {statuses.map((s) => (
              <Button
                key={s}
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-xl h-8 px-3 text-[11px] font-black uppercase tracking-[0.12em] border transition-colors",
                  statusFilter === s
                    ? "bg-[#c91f41] text-white border-[#c91f41]"
                    : "text-gray-500 dark:text-zinc-400 border-transparent hover:bg-gray-100 dark:hover:bg-white/5"
                )}
              >
                {s === "ALL" ? "All" : s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="text-sm hidden md:table">
            <TableHead>
              <TableRow className="border-b border-gray-100 dark:border-white/10">
                <TableHeader className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Employee</TableHeader>
                <TableHeader className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Type</TableHeader>
                <TableHeader className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Duration</TableHeader>
                <TableHeader className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Days</TableHeader>
                <TableHeader className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Status</TableHeader>
                <TableHeader className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((leave) => (
                <TableRow key={leave.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <TableCell>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-100">{leave.userName}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500">{leave.userDepartment || "Unassigned"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">{getLeaveTypeLabel(leave.type)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-500 dark:text-zinc-400">{getLeaveDurationLabel(leave.duration)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">{leave.totalDays}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant[leave.status] as "warning" | "info" | "success" | "error" | "secondary"}>
                      {leave.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {leave.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedId(leave.id)}
                          className="text-xs font-bold"
                        >
                          Review
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
            {filtered.map((leave) => (
              <div key={leave.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-zinc-100">{leave.userName}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">{leave.userDepartment || "Unassigned"}</p>
                  </div>
                  <Badge variant={statusToBadgeVariant[leave.status] as "warning" | "info" | "success" | "error" | "secondary"}>
                    {leave.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 dark:text-zinc-500">Type</span>
                    <p className="font-bold text-slate-700 dark:text-zinc-200">{getLeaveTypeLabel(leave.type)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-zinc-500">Duration</span>
                    <p className="font-bold text-slate-700 dark:text-zinc-200">{getLeaveDurationLabel(leave.duration)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-zinc-500">Days</span>
                    <p className="font-bold text-slate-700 dark:text-zinc-200">{leave.totalDays}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-zinc-500">Dates</span>
                    <p className="font-bold text-slate-700 dark:text-zinc-200">{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
                {leave.reason && (
                  <div className="text-xs">
                    <span className="text-gray-400 dark:text-zinc-500">Reason</span>
                    <p className="text-slate-600 dark:text-zinc-300 line-clamp-2">{leave.reason}</p>
                  </div>
                )}
                {leave.status === "PENDING" && (
                  <button
                    onClick={() => setExpandedId(leave.id)}
                    className="w-full h-9 bg-[#c91f41] hover:bg-[#b31c3a] text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Review Request
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {expandedId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Review Leave Request</h3>
            <textarea
              rows={4}
              placeholder="Review note (optional for approval, required for denial)..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-3 text-sm dark:text-zinc-100"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleDecision(expandedId, "APPROVED")}
                disabled={loading}
                className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Approve & Forward to HR
              </button>
              <button
                onClick={() => handleDecision(expandedId, "DENIED")}
                disabled={loading}
                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Deny
              </button>
            </div>
            <button
              onClick={() => { setExpandedId(null); setReviewNote(""); }}
              className="w-full h-10 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 rounded-xl font-bold text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
