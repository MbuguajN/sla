"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewRefund } from "@/app/actions/financeActions";
import { CreditCard, Search } from "lucide-react";

type Refund = {
  id: number;
  amount: number;
  reason: string;
  status: string;
  userName: string;
  userDepartment: string | null;
  financeNote: string | null;
  createdAt: string;
};

interface Props {
  initialRefunds: Refund[];
}

export default function FinanceRefundsClient({ initialRefunds }: Props) {
  const router = useRouter();
  const [refunds] = useState(initialRefunds);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = refunds.filter((r) => {
    const matchSearch = r.userName.toLowerCase().includes(search.toLowerCase()) || r.reason.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    DENIED: "bg-red-100 text-red-700",
  };

  const handleReview = async (refundId: number, decision: "APPROVED" | "DENIED") => {
    if (decision === "DENIED" && !note.trim()) { alert("Please provide a reason for denial"); return; }
    setLoading(true);
    try {
      await reviewRefund(refundId, decision, note || undefined);
      setReviewingId(null);
      setNote("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const statuses = ["ALL", "PENDING", "APPROVED", "DENIED"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Refund Requests</h1>
          <p className="text-sm text-gray-500">{refunds.filter((r) => r.status === "PENDING").length} pending</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
        </div>
        <div className="flex gap-2">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${statusFilter === s ? "bg-[#c91f41] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {s === "ALL" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-gray-900">{r.userName}</p>
                  <p className="text-xs text-gray-400">{r.userDepartment || "—"}</p>
                </td>
                <td className="px-5 py-4"><span className="text-sm font-bold text-gray-900">R{r.amount.toLocaleString()}</span></td>
                <td className="px-5 py-4">
                  <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">{r.reason}</p>
                  {r.financeNote && <p className="text-xs text-gray-400 mt-1">Note: {r.financeNote}</p>}
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  {r.status === "PENDING" && (
                    reviewingId === r.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <input type="text" placeholder="Note..." value={note} onChange={(e) => setNote(e.target.value)}
                          className="w-28 px-2 py-1 text-xs border border-gray-200 rounded-lg" />
                        <button onClick={() => handleReview(r.id, "APPROVED")} disabled={loading}
                          className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">Approve</button>
                        <button onClick={() => handleReview(r.id, "DENIED")} disabled={loading}
                          className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50">Deny</button>
                        <button onClick={() => { setReviewingId(null); setNote(""); }}
                          className="px-2 py-1 text-xs text-gray-500">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setReviewingId(r.id)}
                        className="px-3 py-1 text-xs font-medium text-[#c91f41] bg-[#fef2f4] rounded-lg hover:bg-red-100">Review</button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No refund requests found</p>
          </div>
        )}
      </div>
    </div>
  );
}
