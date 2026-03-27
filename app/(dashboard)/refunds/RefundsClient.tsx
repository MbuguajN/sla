"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRefund } from "@/app/actions/financeActions";
import { 
  Money01Icon, 
  Add01Icon, 
  ArrowRight01Icon,
  RecordIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  InformationCircleIcon,
  Coins01Icon,
  CreditCardIcon,
  Invoice01Icon
} from "hugeicons-react";
import { cn } from "@/lib/utils";

type RefundRequest = {
  id: number;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
};

interface Props {
  initialRefunds: RefundRequest[];
}

const STEPS = [
  { id: 1, title: "Capital", icon: Coins01Icon },
  { id: 2, title: "Basis", icon: Invoice01Icon },
  { id: 3, title: "Review", icon: CheckmarkCircle01Icon },
];

export default function RefundsClient({ initialRefunds }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
    category: "EXPENSE",
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createRefund({
        amount: parseFloat(formData.amount),
        reason: formData.reason,
      });
      setShowModal(false);
      setFormData({ amount: "", reason: "", category: "EXPENSE" });
      setCurrentStep(1);
      router.refresh();
    } catch (err) {
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !formData.amount) return;
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-white/10">
        <div className="space-y-2">
           <div className="flex items-center gap-2">
             <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
               <Money01Icon className="w-5 h-5 text-emerald-600" />
             </div>
             <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none">Fiscal Return</span>
           </div>
           <h1 className="text-4xl font-black tracking-tight text-[#111827] dark:text-white leading-none">
             Expense <span className="text-emerald-600 italic">Refunds</span>
           </h1>
           <p className="text-[#9ca3af] dark:text-zinc-500 font-bold text-[13px] tracking-tight">
             Submit and track your expense reimbursement claims.
           </p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="group flex items-center gap-3 bg-[#111827] dark:bg-black hover:bg-black dark:hover:bg-emerald-500/10 border border-transparent dark:border-white/10 text-white rounded-2xl px-6 py-4 shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-95"
        >
          <div className="w-6 h-6 rounded-lg bg-white/10 dark:bg-emerald-500/20 flex items-center justify-center">
            <Add01Icon className="w-3.5 h-3.5 text-white dark:text-emerald-500" />
          </div>
          <span className="font-black text-sm uppercase tracking-widest">New Reimbursement</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {initialRefunds.map((item) => (
          <div key={item.id} className="group relative bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-1.5 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-2 overflow-hidden">
            <div className="bg-[#fcfdfe] dark:bg-black rounded-[2rem] p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                     <div className="flex items-center gap-2">
                        <RecordIcon className="w-2 h-2 text-emerald-500" />
                        <span className="text-[10px] font-black text-gray-400 dark:text-zinc-600 uppercase tracking-widest">REF-#{item.id}</span>
                     </div>
                     <h3 className="text-xl font-black text-[#111827] dark:text-white tracking-tight leading-7 line-clamp-2">
                        GH₵ {item.amount.toLocaleString()}
                     </h3>
                  </div>
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-gray-100/50 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 text-emerald-600 bg-emerald-50/20"
                  )}>
                    {item.status}
                  </div>
                </div>
            </div>
          </div>
        ))}
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
                        currentStep >= step.id ? "bg-emerald-600 w-8" : "bg-gray-200 dark:bg-white/10"
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
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Fiscal Value</h2>
                     <div className="relative group/input">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                           <span className="font-black text-gray-400 text-lg uppercase tracking-widest">GH₵</span>
                        </div>
                        <input 
                           type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                           className="w-full h-20 bg-gray-50 dark:bg-white/5 rounded-3xl pl-24 pr-8 font-black text-4xl outline-none border-4 border-transparent focus:border-emerald-600 transition-all dark:text-white"
                        />
                     </div>
                  </div>
               )}

               {currentStep === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Justification Basis</h2>
                     <textarea 
                        rows={6} placeholder="Detailed explanation for the reimbursement..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-white/5 rounded-[2rem] p-8 font-bold text-sm outline-none border-4 border-transparent focus:border-emerald-600 transition-all resize-none dark:text-white"
                     />
                  </div>
               )}

               {currentStep === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 text-center px-10">
                     <div className="mx-auto w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <Money01Icon className="w-12 h-12 text-emerald-600" />
                     </div>
                     <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Transmission Flow</h2>
                     <p className="text-sm font-bold text-gray-400">Total Capital: <span className="text-emerald-600">GH₵ {parseFloat(formData.amount || "0").toLocaleString()}</span>. Ready for submission.</p>
                  </div>
               )}
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-8">
               <button onClick={() => currentStep > 1 && setCurrentStep(prev => prev -1)} className="text-xs font-black uppercase text-gray-400 hover:text-gray-900">Back</button>
               <button 
                  onClick={currentStep === 3 ? handleSubmit : nextStep} disabled={loading}
                  className="bg-[#111827] dark:bg-white text-white dark:text-black px-12 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
               >
                  {loading ? "..." : currentStep === 3 ? "Process Capital" : "Next Segment"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}