"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRequisition } from "@/app/actions/financeActions";
import { 
  ShoppingBag01Icon, 
  Add01Icon, 
  ArrowRight01Icon,
  RecordIcon,
  Cancel01Icon,
  PackageIcon,
  ShoppingBasket01Icon,
  InformationCircleIcon,
  CheckmarkCircle01Icon
} from "hugeicons-react";
import { cn } from "@/lib/utils";

type RequisitionItem = {
  id: number;
  title: string;
  totalAmount: number;
  status: string;
  createdAt: string;
};

interface Props {
  initialRequisitions: RequisitionItem[];
}

const STEPS = [
  { id: 1, title: "Overview", icon: InformationCircleIcon },
  { id: 2, title: "Items", icon: PackageIcon },
  { id: 3, title: "Review", icon: CheckmarkCircle01Icon },
];

export default function RequisitionsClient({ initialRequisitions }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    productType: "",
    items: [{ name: "", quantity: 1, unitPrice: 0, vatInclusive: false }],
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createRequisition({
        title: formData.title,
        reason: formData.title,
        items: formData.items.map((item) => ({
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatInclusive: item.vatInclusive,
        })),
      });
      setShowModal(false);
      setFormData({ title: "", productType: "", items: [{ name: "", quantity: 1, unitPrice: 0, vatInclusive: false }] });
      setCurrentStep(1);
      router.refresh();
    } catch (err) {
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { name: "", quantity: 1, unitPrice: 0, vatInclusive: false }] });
  const removeItem = (idx: number) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) });
  const updateItem = (idx: number, key: string, val: any) => {
    const newItems = [...formData.items];
    (newItems[idx] as any)[key] = val;
    setFormData({ ...formData, items: newItems });
  };

  const nextStep = () => {
    if (currentStep === 1 && (!formData.title || !formData.productType)) return;
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-white/10">
        <div className="space-y-2">
           <div className="flex items-center gap-2">
             <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
               <ShoppingBag01Icon className="w-5 h-5 text-amber-600" />
             </div>
             <span className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] leading-none">Procurement Node</span>
           </div>
           <h1 className="text-4xl font-black tracking-tight text-[#111827] dark:text-white leading-none">
             Stock <span className="text-amber-600 italic">Requisitions</span>
           </h1>
           <p className="text-[#9ca3af] dark:text-zinc-500 font-bold text-[13px] tracking-tight">
             Internal material request system for active departments.
           </p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="group flex items-center gap-3 bg-[#111827] dark:bg-black hover:bg-black dark:hover:bg-amber-500/10 border border-transparent dark:border-white/10 text-white rounded-2xl px-6 py-4 shadow-xl hover:shadow-amber-500/20 transition-all active:scale-95"
        >
          <div className="w-6 h-6 rounded-lg bg-white/10 dark:bg-amber-500/20 flex items-center justify-center">
            <Add01Icon className="w-3.5 h-3.5 text-white dark:text-amber-500" />
          </div>
          <span className="font-black text-sm uppercase tracking-widest">New Procurement</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {initialRequisitions.map((item) => (
          <div key={item.id} className="group relative bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-1.5 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-2 overflow-hidden">
            <div className="bg-[#fcfdfe] dark:bg-black rounded-[2rem] p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                     <div className="flex items-center gap-2">
                        <RecordIcon className="w-2 h-2 text-amber-500" />
                        <span className="text-[10px] font-black text-gray-400 dark:text-zinc-600 uppercase tracking-widest">REQ-#{item.id}</span>
                     </div>
                     <h3 className="text-xl font-black text-[#111827] dark:text-white tracking-tight leading-7 line-clamp-2">
                        {item.title}
                     </h3>
                  </div>
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-gray-100/50 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase text-gray-400">KES {item.totalAmount.toLocaleString()}</span>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 text-amber-600 bg-amber-50/20"
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
                        currentStep >= step.id ? "bg-amber-600 w-8" : "bg-gray-200 dark:bg-white/10"
                     )} />
                  ))}
               </div>
               <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <Cancel01Icon className="w-5 h-5 text-gray-400" />
               </button>
            </div>

            <div className="min-h-[400px] flex flex-col justify-center">
               {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Overview</h2>
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Description Node</span>
                           <input 
                              type="text" placeholder="e.g. Monthly Office Supplies" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                              className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-amber-600 transition-all dark:text-white"
                           />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Product Type</span>
                          <input 
                            type="text" placeholder="e.g. Office Supplies" value={formData.productType} onChange={e => setFormData({...formData, productType: e.target.value})}
                            className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-amber-600 transition-all dark:text-white"
                          />
                        </div>
                     </div>
                  </div>
               )}

               {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 max-h-[420px] overflow-y-auto pr-2">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4">Items</h2>
                     {formData.items.map((item, idx) => {
                        const rowTotal = item.quantity * item.unitPrice * (item.vatInclusive ? 1.16 : 1);
                        return (
                           <div key={idx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl space-y-3">
                              <div className="flex gap-3">
                                 <input
                                    type="text" placeholder="Item Name" value={item.name} onChange={e => updateItem(idx, "name", e.target.value)}
                                    className="flex-1 bg-white dark:bg-black rounded-xl h-10 px-4 font-bold text-[13px] outline-none"
                                 />
                                 <input
                                    type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                                    className="w-20 bg-white dark:bg-black rounded-xl h-10 px-4 font-bold text-[13px] outline-none"
                                 />
                                 <input
                                    type="number" placeholder="Unit Price" value={item.unitPrice || ""} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                                    className="w-32 bg-white dark:bg-black rounded-xl h-10 px-4 font-bold text-[13px] outline-none"
                                 />
                                 <button onClick={() => removeItem(idx)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors">
                                    <Cancel01Icon className="w-4 h-4" />
                                 </button>
                              </div>
                              <div className="flex items-center justify-between px-1">
                                 <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                       type="checkbox" checked={item.vatInclusive} onChange={e => updateItem(idx, "vatInclusive", e.target.checked)}
                                       className="w-4 h-4 accent-amber-600"
                                    />
                                    <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">VAT (16%)</span>
                                 </label>
                                 <span className="text-[11px] font-black text-amber-600">
                                    KES {rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 </span>
                              </div>
                           </div>
                        );
                     })}
                     <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl font-black text-[10px] uppercase text-gray-400 hover:border-amber-600 transition-all">Add Item</button>
                     {(() => {
                        const grandTotal = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.vatInclusive ? 1.16 : 1), 0);
                        return (
                           <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
                              <span className="text-[11px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-widest">Grand Total</span>
                              <span className="text-base font-black text-amber-600">
                                 KES {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                           </div>
                        );
                     })()}
                  </div>
               )}

               {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 text-center">
                     <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                        <ShoppingBasket01Icon className="w-10 h-10 text-amber-600" />
                     </div>
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Final Registry</h2>
                     <p className="text-sm font-bold text-gray-400 max-w-xs mx-auto">Confirm your requisition for {formData.items.length} item{formData.items.length !== 1 ? "s" : ""}. This will be transmitted to procurement.</p>
                     <div className="inline-flex items-center gap-3 px-6 py-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
                        <span className="text-[11px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-widest">Total</span>
                        <span className="text-lg font-black text-amber-600">
                           KES {formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.vatInclusive ? 1.16 : 1), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                     </div>
                  </div>
               )}
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-8">
               <button onClick={() => currentStep > 1 && setCurrentStep(prev => prev -1)} className="text-xs font-black uppercase text-gray-400 hover:text-gray-900">Back</button>
               <button 
                  onClick={currentStep === 3 ? handleSubmit : nextStep} disabled={loading}
                  className="bg-[#111827] dark:bg-white text-white dark:text-black px-10 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
               >
                {loading ? "..." : currentStep === 3 ? "Transmit Request" : "Next"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}