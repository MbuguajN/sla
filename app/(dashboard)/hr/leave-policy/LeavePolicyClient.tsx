"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertLeavePolicy, addPublicHoliday, deletePublicHoliday } from "@/app/actions/hrActions";
import { Plus, Trash2, X, AlertCircle, Check, CalendarDays, ShieldCheck } from "lucide-react";

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
      {/* Page header */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 rounded-3xl bg-white border border-gray-100 p-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-[#fef2f4] rounded-xl">
              <ShieldCheck className="h-4 w-4 text-[#c91f41]" />
            </div>
            <span className="text-[11px] font-black text-[#c91f41] uppercase tracking-[0.2em]">Policy Engine</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Leave Policy</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Configure leave allocations per role and manage public holidays.
          </p>
        </div>
        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-white border border-gray-100 p-6 flex flex-col justify-between">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Policy Entries</span>
            <p className="text-4xl font-black text-slate-800 mt-2">{policies.length}</p>
            <span className="text-xs text-gray-400 font-semibold mt-1">across all roles & types</span>
          </div>
          <div className="rounded-3xl bg-white border border-gray-100 p-6 flex flex-col justify-between">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Public Holidays</span>
            <p className="text-4xl font-black text-slate-800 mt-2">{holidays.length}</p>
            <span className="text-xs text-gray-400 font-semibold mt-1">registered this year</span>
          </div>
        </div>
      </section>

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold border border-emerald-100">
          <Check className="h-4 w-4" /> Policy saved successfully
        </div>
      )}

      {/* Leave Allocations Table */}
      <div className="rounded-3xl bg-white border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900">Leave Allocations</h2>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">days allowed per year</p>
          </div>
          <button
            onClick={() => { setShowPolicyModal(true); setError(""); }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#c91f41] bg-[#fef2f4] rounded-xl hover:bg-red-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Edit Policy
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="text-left text-[10px] text-gray-400 font-black tracking-[0.16em] uppercase border-b border-gray-100">
                <th className="px-6 py-3">Role</th>
                {leaveTypes.map((t) => (
                  <th key={t} className="px-4 py-3 text-center">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <span className="text-xs font-black uppercase tracking-widest text-[#c91f41] bg-[#fef2f4] px-2.5 py-1 rounded-lg">{role}</span>
                  </td>
                  {leaveTypes.map((type) => (
                    <td key={type} className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                      {policyMap[`${role}-${type}`] != null
                        ? <span className="inline-block min-w-[2rem] text-sm font-black text-gray-900">{policyMap[`${role}-${type}`]}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Public Holidays */}
      <div className="rounded-3xl bg-white border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900">Public Holidays</h2>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">{holidays.length} registered</p>
          </div>
          <button
            onClick={() => { setShowHolidayModal(true); setError(""); }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#c91f41] bg-[#fef2f4] rounded-xl hover:bg-red-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Holiday
          </button>
        </div>
        {holidays.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] text-gray-400 font-black tracking-[0.16em] uppercase border-b border-gray-100">
                <th className="px-6 py-3">Holiday</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-[#fef2f4] flex items-center justify-center">
                        <CalendarDays className="h-4 w-4 text-[#c91f41]" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{h.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-500">
                    {new Date(h.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-14 text-center">
            <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-400">No public holidays registered</p>
          </div>
        )}
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
