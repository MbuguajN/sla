"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewLeave } from "@/app/actions/hrActions";
import {
  CalendarDays,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
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

type LeaveItem = {
  id: number;
  userId: number;
  userName: string;
  userDepartment: string | null;
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

export default function HRLeavesClient({ initialLeaves }: Props) {
  const router = useRouter();
  const [leaves] = useState(initialLeaves);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleReview = async (leaveId: number, decision: "APPROVED" | "DENIED") => {
    setLoading(true);
    try {
      await reviewLeave(leaveId, decision, reviewNote || undefined);
      setReviewingId(null);
      setReviewNote("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to review leave");
    } finally {
      setLoading(false);
    }
  };

  const statuses = ["ALL", "PENDING", "APPROVED", "DENIED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-sm text-gray-500">
            {leaves.filter((l) => l.status === "PENDING").length} pending
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {statuses.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "ALL" ? "All" : s}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {filtered.length > 0 ? (
            <Table>
              <TableHead>
                <TableHeader>Employee</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Dates</TableHeader>
                <TableHeader>Days</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableHead>
              <TableBody>
                {filtered.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-gray-900">
                        {leave.userName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {leave.userDepartment || "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{leave.type}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(leave.startDate).toLocaleDateString()} —{" "}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-gray-900">
                        {leave.totalDays}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusToBadgeVariant[leave.status] || "secondary"
                        }
                      >
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {leave.status === "PENDING" &&
                        (reviewingId === leave.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              placeholder="Note (optional)"
                              value={reviewNote}
                              onChange={(e:React.ChangeEvent<HTMLInputElement>) =>
                                setReviewNote(e.target.value)
                              }
                              className="w-32 text-xs"
                            />
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() =>
                                handleReview(leave.id, "APPROVED")
                              }
                              disabled={loading}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="error"
                              size="sm"
                              onClick={() =>
                                handleReview(leave.id, "DENIED")
                              }
                              disabled={loading}
                            >
                              Deny
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReviewingId(null);
                                setReviewNote("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewingId(leave.id)}
                          >
                            Review
                          </Button>
                        ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No leave requests found</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
