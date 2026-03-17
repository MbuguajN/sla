"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveRequisitionAsFinance,
  approveRequisitionAsCEO,
  denyRequisition,
} from "@/app/actions/financeActions";
import { Receipt, Search, ChevronDown } from "lucide-react";

type ReqItem = { id: number; itemName: string; quantity: number; unitPrice: number; vatInclusive: boolean };
type Requisition = {
  id: number;
  title: string;
  reason: string;
  totalAmount: number;
  status: string;
  userName: string;
  userDepartment: string | null;
  managerNote: string | null;
  financeNote: string | null;
  ceoNote: string | null;
  items: ReqItem[];
  createdAt: string;
};

interface Props {
  initialRequisitions: Requisition[];
  currentUserRole: string;
}

export default function FinanceRequisitionsClient({ initialRequisitions, currentUserRole }: Props) {
  const router = useRouter();
  const [requisitions] = useState(initialRequisitions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = requisitions.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.userName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColors: Record<string, string> = {
    PENDING_MANAGER: "bg-yellow-100 text-yellow-700",
    PENDING_FINANCE: "bg-blue-100 text-blue-700",
    PENDING_CEO: "bg-purple-100 text-purple-700",
    APPROVED: "bg-green-100 text-green-700",
    DENIED: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    PENDING_MANAGER: "Pending Manager",
    PENDING_FINANCE: "Pending Finance",
    PENDING_CEO: "Pending CEO",
    APPROVED: "Approved",
    DENIED: "Denied",
  };

  const handleApprove = async (reqId: number) => {
    setLoading(true);
    try {
      const req = requisitions.find((r) => r.id === reqId);
      if (!req) return;

      if (req.status === "PENDING_FINANCE") {
        await approveRequisitionAsFinance(reqId, actionNote || undefined);
      } else if (req.status === "PENDING_CEO") {
        await approveRequisitionAsCEO(reqId, actionNote || undefined);
      }

      setActionNote("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async (reqId: number) => {
    if (!actionNote.trim()) { alert("Please provide a reason for denial"); return; }
    setLoading(true);
    try {
      const req = requisitions.find((r) => r.id === reqId);
      await denyRequisition(reqId, actionNote, req?.status || "");
      setActionNote("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const statuses = ["ALL", "PENDING_MANAGER", "PENDING_FINANCE", "PENDING_CEO", "APPROVED", "DENIED"];

  const canActOnReq = (status: string) => {
    if (status === "PENDING_FINANCE" && (currentUserRole === "ADMIN" || currentUserRole === "CEO")) return true;
    if (status === "PENDING_FINANCE") return true; // Finance user viewing this page
    if (status === "PENDING_CEO" && (currentUserRole === "ADMIN" || currentUserRole === "CEO")) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <Receipt className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Requisitions</h1>
          <p className="text-sm text-gray-500">
            {requisitions.filter((r) => r.status === "PENDING_FINANCE" || r.status === "PENDING_CEO").length} pending approval
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]">
          {statuses.map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All Status" : statusLabels[s] || s}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[r.status]}`}>{statusLabels[r.status]}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{r.userName} &middot; {r.userDepartment || "—"} &middot; {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-gray-900">R{r.totalAmount.toLocaleString()}</p>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedId === r.id ? "rotate-180" : ""}`} />
              </div>
            </div>

            {expandedId === r.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                <p className="text-sm text-gray-600">{r.reason}</p>
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-400">
                    <th className="text-left pb-2">Item</th>
                    <th className="text-right pb-2">Qty</th>
                    <th className="text-right pb-2">Price</th>
                    <th className="text-right pb-2">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {r.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1.5 text-gray-700">{item.itemName}{item.vatInclusive && <span className="text-xs text-gray-400 ml-1">(VAT)</span>}</td>
                        <td className="py-1.5 text-right text-gray-600">{item.quantity}</td>
                        <td className="py-1.5 text-right text-gray-600">R{item.unitPrice.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-medium text-gray-900">R{(item.quantity * item.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {r.managerNote && <p className="text-xs text-gray-500">Manager: {r.managerNote}</p>}
                {r.financeNote && <p className="text-xs text-gray-500">Finance: {r.financeNote}</p>}
                {r.ceoNote && <p className="text-xs text-gray-500">CEO: {r.ceoNote}</p>}

                {canActOnReq(r.status) && (
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <input type="text" placeholder="Add a note..." value={actionNote} onChange={(e) => setActionNote(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleApprove(r.id)} disabled={loading}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                        Approve
                      </button>
                      <button onClick={() => handleDeny(r.id)} disabled={loading}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50">
                        Deny
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No requisitions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
