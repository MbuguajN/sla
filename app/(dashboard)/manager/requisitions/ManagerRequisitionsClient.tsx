"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { advanceRequisition, rejectRequisition } from "@/app/actions/financeActions";
import { Invoice01Icon, CheckmarkCircle01Icon, Cancel01Icon, ArrowDown01Icon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

type ReqItem = { id: number; itemName: string; quantity: number; unitPrice: number; vatInclusive: boolean };
type Requisition = {
  id: number;
  title: string;
  totalAmount: number;
  status: string;
  user: { name: string };
  items: ReqItem[];
};

interface Props {
  initialRequisitions: Requisition[];
}

function formatStatusLabel(status: string) {
  return status.split("_").join(" ");
}

export default function ManagerRequisitionsClient({ initialRequisitions }: Props) {
  const router = useRouter();
  const [requisitions, setRequisitions] = useState(initialRequisitions);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async (reqId: number) => {
    setLoading(true);
    try {
      await advanceRequisition(reqId, actionNote || undefined);
      setRequisitions((prev) => prev.filter((r) => r.id !== reqId));
      setActionNote("");
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve requisition");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async (reqId: number) => {
    setLoading(true);
    try {
      await rejectRequisition(reqId, actionNote || "Denied");
      setRequisitions((prev) => prev.filter((r) => r.id !== reqId));
      setActionNote("");
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject requisition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <Invoice01Icon className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Requisitions</h1>
          <p className="text-sm text-gray-500">Review and approve team member requests</p>
        </div>
      </div>

      {requisitions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Invoice01Icon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-900 font-bold text-lg">No pending requisitions</p>
          <p className="text-gray-500 font-medium mt-2">All team requisitions have been reviewed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requisitions.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase">REQ</span>
                    <span className="text-base font-black text-gray-900">#{req.id}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{req.title}</h3>
                    <p className="text-sm text-gray-500">Requested by {req.user.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xl font-black text-[#c91f41]">
                    KES {req.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                    className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  >
                    <ArrowDown01Icon className={cn("w-5 h-5 transition-transform", expandedId === req.id && "rotate-180")} />
                  </button>
                </div>
              </div>

              {expandedId === req.id && (
                <div className="px-6 pb-6 space-y-6 border-t border-gray-100 pt-6">
                  {/* Items */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {req.items.map((item, idx) => {
                        const rowTotal = item.quantity * item.unitPrice * (item.vatInclusive ? 1.16 : 1);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{item.itemName}</p>
                              <p className="text-[10px] text-gray-500">Qty: {item.quantity} @ KES {item.unitPrice.toLocaleString()}</p>
                            </div>
                            <span className="text-sm font-black text-[#c91f41]">
                              KES {rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <textarea
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Review notes (optional)..."
                      className="w-full h-20 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#c91f41] transition-colors resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={loading}
                        className="h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                      >
                        <CheckmarkCircle01Icon className="w-4 h-4" /> Approve & Send to Finance
                      </button>
                      <button
                        onClick={() => handleDeny(req.id)}
                        disabled={loading}
                        className="h-12 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                      >
                        <Cancel01Icon className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
