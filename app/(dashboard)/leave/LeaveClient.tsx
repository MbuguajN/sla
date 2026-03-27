"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLeave, cancelLeave } from "@/app/actions/hrActions";
import { 
  Calendar01Icon, 
  Add01Icon, 
  ArrowRight01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  NoteIcon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

type LeaveRequest = {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string;
};

interface Props {
  initialLeaves: LeaveRequest[];
}

const STEPS = [
  { id: 1, title: "Nature", icon: InformationCircleIcon },
  { id: 2, title: "Duration", icon: Calendar01Icon },
  { id: 3, title: "Reason", icon: NoteIcon },
];

export default function LeaveClient({ initialLeaves }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "ANNUAL",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
         await createLeave({
        type: formData.type as any,
            startDate: formData.startDate,
            endDate: formData.endDate,
        reason: formData.reason,
      });
      setShowModal(false);
      setFormData({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
      setCurrentStep(1);
      router.refresh();
    } catch (err) {
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 2 && (!formData.startDate || !formData.endDate)) return;
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleCancelLeave = async (leaveId: number) => {
    if (!confirm("Cancel this leave request?")) return;
    try {
      await cancelLeave(leaveId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to cancel leave");
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-white/10">
        <div className="space-y-2">
           <div className="flex items-center gap-2">
             <div className="p-2 bg-pink-50 dark:bg-pink-500/10 rounded-xl">
               <Calendar01Icon className="w-5 h-5 text-pink-600" />
             </div>
             <span className="text-[11px] font-black text-pink-600 uppercase tracking-[0.2em] leading-none">Absence Protocol</span>
           </div>
           <h1 className="text-4xl font-black tracking-tight text-[#111827] dark:text-white leading-none">
             Leave <span className="text-pink-600 italic">Management</span>
           </h1>
           <p className="text-[#9ca3af] dark:text-zinc-500 font-bold text-[13px] tracking-tight">
             Request and track your time-off applications securely.
           </p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="group flex items-center gap-3 bg-[#111827] dark:bg-black hover:bg-black dark:hover:bg-pink-500/10 border border-transparent dark:border-white/10 text-white rounded-2xl px-6 py-4 shadow-xl hover:shadow-pink-500/20 transition-all active:scale-95"
        >
          <div className="w-6 h-6 rounded-lg bg-white/10 dark:bg-pink-500/20 flex items-center justify-center">
            <Add01Icon className="w-3.5 h-3.5 text-white dark:text-pink-500" />
          </div>
          <span className="font-black text-sm uppercase tracking-widest">Submit Application</span>
        </button>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">{initialLeaves.length} request{initialLeaves.length !== 1 ? "s" : ""} on record</p>
        </div>
        <div className="overflow-x-auto">
          {initialLeaves.length > 0 ? (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-[10px] text-gray-400 font-black tracking-[0.16em] uppercase border-b border-gray-100">
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Start Date</th>
                  <th className="px-6 py-3">End Date</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {initialLeaves.map((item) => {
                  const start = new Date(item.startDate);
                  const end = new Date(item.endDate);
                  const statusColors: Record<string, string> = {
                    APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-100",
                    DENIED: "bg-rose-50 text-rose-700 border border-rose-100",
                    PENDING: "bg-pink-50 text-pink-700 border border-pink-100",
                    CANCELLED: "bg-gray-100 text-gray-600 border border-gray-200",
                  };
                  return (
                    <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-black uppercase tracking-widest text-pink-600 bg-pink-50 px-2.5 py-1 rounded-lg">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-700">{start.toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-700">{end.toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.totalDays}d</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[220px] truncate">{item.reason || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${statusColors[item.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.status === "PENDING" ? (
                          <button
                            onClick={() => handleCancelLeave(item.id)}
                            className="inline-flex h-8 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-rose-600 hover:bg-rose-100"
                          >
                            Cancel Request
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300">No Action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <Calendar01Icon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400">No leave applications found</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 transition-opacity" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-black rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 border border-gray-100 dark:border-white/10 overflow-hidden">
             <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                  {STEPS.map(step => (
                     <div key={step.id} className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all",
                        currentStep >= step.id ? "bg-pink-600 w-8" : "bg-gray-200 dark:bg-white/10"
                     )} />
                  ))}
               </div>
               <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <Cancel01Icon className="w-5 h-5 text-gray-400" />
               </button>
            </div>

            <div className="min-h-[300px] flex flex-col justify-center">
               {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Select Nature</h2>
                     <div className="grid grid-cols-2 gap-4">
                        {["ANNUAL", "SICK", "BEREAVEMENT", "UNPAID"].map(type => (
                           <button 
                              key={type} onClick={() => { setFormData({...formData, type}); nextStep(); }}
                              className={cn(
                                 "h-16 px-6 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all text-left flex items-center justify-between",
                                 formData.type === type ? "border-pink-600 bg-pink-50/50 dark:bg-pink-500/10 text-pink-600" : "border-gray-50 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-400"
                              )}
                           >
                              {type}
                              {formData.type === type && <ArrowRight01Icon className="w-4 h-4" />}
                           </button>
                        ))}
                     </div>
                  </div>
               )}

               {currentStep === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Duration</h2>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Start Node</span>
                           <input 
                              type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
                              className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-pink-600 transition-all dark:text-white"
                           />
                        </div>
                        <div className="space-y-2">
                           <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">End Node</span>
                           <input 
                              type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}
                              className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-pink-600 transition-all dark:text-white"
                           />
                        </div>
                     </div>
                  </div>
               )}

               {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Core Reason</h2>
                     <textarea 
                        rows={6} placeholder="Please justify your leave request..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-white/5 rounded-2xl p-6 font-bold text-sm outline-none border-2 border-transparent focus:border-pink-600 transition-all resize-none dark:text-white"
                     />
                  </div>
               )}
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-8">
               <button onClick={() => currentStep > 1 && setCurrentStep(prev => prev -1)} className="text-xs font-black uppercase text-gray-400 hover:text-gray-900">Back</button>
               <button 
                  onClick={currentStep === 3 ? handleSubmit : nextStep} disabled={loading}
                  className="bg-[#111827] dark:bg-white text-white dark:text-black px-10 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
               >
                  {loading ? "..." : currentStep === 3 ? "Process Flow" : "Next Segment"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}