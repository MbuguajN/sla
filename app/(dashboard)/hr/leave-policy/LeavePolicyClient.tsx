"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertLeavePolicy, addPublicHoliday, deletePublicHoliday } from "@/app/actions/hrActions";
import { Settings, Plus, Trash2, CalendarDays, X, AlertCircle, Check } from "lucide-react";

type Policy = { id: number; role: string; leaveType: string; daysAllowed: number };
type Holiday = { id: number; name: string; date: string };

interface Props {
  initialPolicies: Policy[];
  initialHolidays: Holiday[];
}

const roles = ["ADMIN", "CEO", "MANAGER", "EMPLOYEE"];
const leaveTypes = ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID", "COMPASSIONATE", "OTHER"];

export default function LeavePolicyClient({ initialPolicies, initialHolidays }: Props) {
  const router = useRouter();
  const [policies] = useState(initialPolicies);
  const [holidays] = useState(initialHolidays);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [policyForm, setPolicyForm] = useState({ role: "EMPLOYEE", leaveType: "ANNUAL", daysAllowed: "21" });
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "" });

  // Build policy lookup
  const policyMap: Record<string, number> = {};
  for (const p of policies) {
    policyMap[`${p.role}-${p.leaveType}`] = p.daysAllowed;
  }

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await upsertLeavePolicy({
        role: policyForm.role as "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE",
        leaveType: policyForm.leaveType as "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY" | "UNPAID" | "COMPASSIONATE" | "OTHER",
        daysAllowed: parseInt(policyForm.daysAllowed),
      });
      setShowPolicyModal(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await addPublicHoliday(holidayForm.name, holidayForm.date);
      setShowHolidayModal(false);
      setHolidayForm({ name: "", date: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm("Delete this public holiday?")) return;
    try {
      await deletePublicHoliday(id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <Settings className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leave Policy</h1>
          <p className="text-sm text-gray-500">Manage leave allocations and public holidays</p>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
          <Check className="h-4 w-4" />Policy saved
        </div>
      )}

      {/* Leave Allocations Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Leave Allocations (days/year)</h2>
          <button onClick={() => { setShowPolicyModal(true); setError(""); }}
            className="px-3 py-1.5 text-xs font-medium text-[#c91f41] bg-[#fef2f4] rounded-lg hover:bg-red-100">
            Edit Policy
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                {leaveTypes.map((t) => (
                  <th key={t} className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((role) => (
                <tr key={role} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{role}</td>
                  {leaveTypes.map((type) => (
                    <td key={type} className="px-3 py-3 text-center text-sm text-gray-600">
                      {policyMap[`${role}-${type}`] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Public Holidays */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Public Holidays ({holidays.length})</h2>
          <button onClick={() => { setShowHolidayModal(true); setError(""); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#c91f41] bg-[#fef2f4] rounded-lg hover:bg-red-100">
            <Plus className="h-3 w-3" />Add Holiday
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-900">{h.name}</span>
                <span className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString()}</span>
              </div>
              <button onClick={() => handleDeleteHoliday(h.id)} className="p-1 text-gray-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {holidays.length === 0 && (
            <div className="text-center py-8"><p className="text-sm text-gray-400">No public holidays added</p></div>
          )}
        </div>
      </div>

      {/* Edit Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPolicyModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Set Leave Allocation</h2>
              <button onClick={() => setShowPolicyModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {error && (<div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="h-4 w-4" />{error}</div>)}
            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={policyForm.role} onChange={(e) => setPolicyForm({ ...policyForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]">
                  {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select value={policyForm.leaveType} onChange={(e) => setPolicyForm({ ...policyForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]">
                  {leaveTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Allowed</label>
                <input type="number" required min="0" value={policyForm.daysAllowed} onChange={(e) => setPolicyForm({ ...policyForm, daysAllowed: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPolicyModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg disabled:opacity-50">
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHolidayModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Public Holiday</h2>
              <button onClick={() => setShowHolidayModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {error && (<div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="h-4 w-4" />{error}</div>)}
            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                <input type="text" required value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" required value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowHolidayModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg disabled:opacity-50">
                  {loading ? "Adding..." : "Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
