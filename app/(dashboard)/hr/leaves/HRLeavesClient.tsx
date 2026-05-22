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
  viewOnly?: boolean;
}

export default function HRLeavesClient({ initialLeaves, viewOnly = false }: Props) {
  const router = useRouter();
  const [leaves, setLeaves] = useState(initialLeaves);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = leaves.filter((l) => {
    const matchSearch = l.userName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusToBadgeVariant: Record<string, string> = {
    PENDING: "warning",
    APPROVED: "success",
    DENIED: "error",
    CANCELLED: "secondary",
  };

  const statuses = ["ALL", "PENDING", "APPROVED", "DENIED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-[#fef2f4] dark:bg-[#c91f41]/10 rounded-xl">
              <CalendarDays className="h-4 w-4 text-[#c91f41]" />
            </div>
            <span className="text-[11px] font-black text-[#c91f41] uppercase tracking-[0.2em]">Attendance Desk</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Leave Requests</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">Review submitted leave requests and process approvals quickly.</p>
        </div>
        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Pending</p>
            <p className="text-4xl font-black text-slate-800 dark:text-white mt-2">{leaves.filter((l) => l.status === "PENDING").length}</p>
          </div>
          <div className="rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Approved</p>
            <p className="text-4xl font-black text-slate-800 dark:text-white mt-2">{leaves.filter((l) => l.status === "APPROVED").length}</p>
          </div>
          <div className="rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Cancelled / Denied</p>
            <p className="text-4xl font-black text-slate-800 dark:text-white mt-2">{leaves.filter((l) => l.status === "CANCELLED" || l.status === "DENIED").length}</p>
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
                    ? "bg-[#c91f41] border-[#c91f41] text-white hover:bg-[#b31c3a]"
                    : "bg-white dark:bg-black border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:border-[#f0c8d2] hover:text-[#c91f41]"
                )}
              >
                {s === "ALL" ? "All" : s}
              </Button>
            ))}
          </div>
        </div>

        <Card className="rounded-none border-0 shadow-none bg-transparent">
          <CardBody className="p-0">
            {filtered.length > 0 ? (
              <Table>
                <TableHead>
                  <TableHeader>Employee</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Dates</TableHeader>
                  <TableHeader>Days</TableHeader>
                  <TableHeader>Status</TableHeader>
                  {!viewOnly && <TableHeader>Actions</TableHeader>}
                </TableHead>
                <TableBody>
                  {filtered.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{leave.userName}</p>
                        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{leave.userDepartment || "Unassigned"}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-black uppercase tracking-widest text-[#c91f41] bg-[#fef2f4] dark:bg-[#c91f41]/10 px-2.5 py-1 rounded-lg">
                          {getLeaveTypeLabel(leave.type)} ({getLeaveDurationLabel(leave.duration)})
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-zinc-300">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-black text-gray-900 dark:text-white">{leave.totalDays}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusToBadgeVariant[leave.status] || "secondary"}>{leave.status}</Badge>
                      </TableCell>
                      {!viewOnly && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/hr/leaves/${leave.id}`)}
                        >
                          Review
                        </Button>
                      </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-14">
                <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">No leave requests found</p>
              </div>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
