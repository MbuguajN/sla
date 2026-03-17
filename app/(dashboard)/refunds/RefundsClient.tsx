"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRefund } from "@/app/actions/financeActions";
import { CreditCard, Plus, X, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";

type RefundItem = {
  id: number;
  amount: number;
  reason: string;
  status: string;
  financeNote: string | null;
  createdAt: string;
};

interface Props {
  initialRefunds: RefundItem[];
}

export default function RefundsClient({ initialRefunds }: Props) {
  const router = useRouter();
  const [refunds] = useState(initialRefunds);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({ amount: "", reason: "" });

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    DENIED: "bg-red-100 text-red-700",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createRefund({ amount: parseFloat(formData.amount), reason: formData.reason });
      setShowModal(false);
      setFormData({ amount: "", reason: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Refunds</h1>
            <p className="text-sm text-gray-500">{refunds.length} requests</p>
          </div>
        </div>
        <button onClick={() => { setShowModal(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors">
          <Plus className="h-4 w-4" />Request Refund
        </button>
      </div>

      <div className="space-y-3">
        {refunds.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-gray-900">R{r.amount.toLocaleString()}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[r.status]}`}>{r.status}</span>
              </div>
              <p className="text-sm text-gray-600">{r.reason}</p>
              {r.financeNote && <p className="text-xs text-gray-500 mt-2">Finance: {r.financeNote}</p>}
              <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}

        {refunds.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No refund requests</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Request Refund</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            {error && (<div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>)}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (R)</label>
                <input type="number" required min="0.01" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea required value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41] resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg disabled:opacity-50">
                  {loading ? "Submitting..." : "Submit Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
