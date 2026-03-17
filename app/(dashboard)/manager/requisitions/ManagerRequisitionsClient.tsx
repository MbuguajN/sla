"use client";

import { useState } from "react";
import { approveRequisitionAsManager, denyRequisition } from "@/app/actions/financeActions";
import { Receipt, Check, X } from "lucide-react";

type Requisition = {
  id: number;
  title: string;
  totalAmount: number;
  status: string;
  user: { name: string };
  items: Array<{ itemName: string; quantity: number; unitPrice: number }>;
};

interface Props {
  initialRequisitions: Requisition[];
}

export default function ManagerRequisitionsClient({ initialRequisitions }: Props) {
  const [requisitions, setRequisitions] = useState(initialRequisitions);
  const [approving, setApproving] = useState<number | null>(null);
  const [denyingId, setDenyingId] = useState<number | null>(null);
  const [denyNote, setDenyNote] = useState("");

  const handleApprove = async (reqId: number) => {
    setApproving(reqId);
    try {
      await approveRequisitionAsManager(reqId);
      setRequisitions((prev) =>
        prev.map((r) =>
          r.id === reqId ? { ...r, status: "PENDING_FINANCE" } : r
        )
      );
      alert("Requisition approved and sent to Finance");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setApproving(null);
    }
  };

  const handleDeny = async (reqId: number) => {
    if (!denyNote.trim()) {
      alert("Please provide a note for denial");
      return;
    }
    setDenyingId(reqId);
    try {
      await denyRequisition(reqId, denyNote, "manager");
      setRequisitions((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: "DENIED" } : r))
      );
      setDenyNote("");
      alert("Requisition denied");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deny");
    } finally {
      setDenyingId(null);
    }
  };

  const pending = requisitions.filter((r) => r.status === "PENDING_MANAGER");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <Receipt className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Requisitions</h1>
          <p className="text-sm text-gray-500">Review and approve team member requests</p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No pending requisitions</p>
          <p className="text-xs text-gray-400 mt-1">All team requisitions have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{req.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Requested by: <span className="font-medium">{req.user.name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#c91f41]">
                    R{req.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                {req.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span className="text-gray-700">
                      {item.itemName} x {item.quantity}
                    </span>
                    <span className="text-gray-900 font-medium">
                      R{(item.quantity * item.unitPrice).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={approving === req.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {approving === req.id ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => setDenyingId(denyingId === req.id ? null : req.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Deny
                </button>
              </div>

              {/* Deny form */}
              {denyingId === req.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <textarea
                    value={denyNote}
                    onChange={(e) => setDenyNote(e.target.value)}
                    placeholder="Reason for denial..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleDeny(req.id)}
                      disabled={denyingId === req.id}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Confirm Denial
                    </button>
                    <button
                      onClick={() => setDenyingId(null)}
                      className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
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
