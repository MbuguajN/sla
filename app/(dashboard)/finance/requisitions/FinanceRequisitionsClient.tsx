"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  advanceRequisition,
  rejectRequisition,
} from "@/app/actions/financeActions";
import { InvoiceIcon, Search01Icon, ArrowDown01Icon, CheckmarkCircle01Icon, Cancel01Icon, Clock01Icon, ShoppingBasket01Icon, BitcoinIcon, SquareLock02Icon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import RichTextEditor from "@/components/RichTextEditor";
import MarkdownRenderer from "@/components/MarkdownRenderer";

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
  canReviewAsManager: boolean;
  canReviewAsFinance: boolean;
}

function formatStatusLabel(status: string) {
  return status.split("_").join(" ");
}

export default function FinanceRequisitionsClient({
  initialRequisitions,
  canReviewAsManager,
  canReviewAsFinance,
}: Props) {
  const router = useRouter();
  const [requisitions, setRequisitions] = useState(initialRequisitions);
  useEffect(() => { setRequisitions(initialRequisitions); }, [initialRequisitions]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [itemsDisplayed, setItemsDisplayed] = useState(9);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [loading, setLoading] = useState(false);
  const isManagerReviewer = canReviewAsManager;
  const isFinanceReviewer = canReviewAsFinance;

  const handleApprove = async (reqId: number) => {
    setLoading(true);
    try {
      await advanceRequisition(reqId, actionNote || undefined);

      const nextStatus = isManagerReviewer
        ? "PENDING_FINANCE"
        : "APPROVED";

      setRequisitions(prev => prev.map(r => r.id === reqId ? { ...r, status: nextStatus } : r));
      setActionNote("");
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit requisition for approval");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async (reqId: number) => {
    setLoading(true);
    try {
      await rejectRequisition(reqId, actionNote || "Denied");
      setRequisitions(prev => prev.map(r => r.id === reqId ? { ...r, status: "DENIED" } : r));
      setActionNote("");
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject requisition");
    } finally {
      setLoading(false);
    }
  };

  const filtered = requisitions.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.userName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;

    if (!matchSearch || !matchStatus) return false;

    if (filterFromDate || filterToDate) {
      const itemDate = new Date(r.createdAt).getTime();
      const fromTime = filterFromDate ? new Date(filterFromDate).getTime() : 0;
      const toTime = filterToDate
        ? new Date(new Date(filterToDate).getTime() + 86400000).getTime()
        : Infinity;

      if (itemDate < fromTime || itemDate > toTime) return false;
    }

    return true;
  });

  const displayedItems = filtered.slice(0, itemsDisplayed);
  const hasMore = itemsDisplayed < filtered.length;

  const statuses = ["ALL", "PENDING_MANAGER", "PENDING_FINANCE", "APPROVED", "DENIED"];

  return (
    <div className="max-w-[1600px] mx-auto pb-20 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-white/10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
              <BitcoinIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none">Budgetary Control</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[#111827] dark:text-white leading-none">
            Procurement <span className="text-emerald-600 italic">Audit</span>
          </h1>
          <p className="text-[#9ca3af] dark:text-zinc-500 font-bold text-[13px] tracking-tight">
            Reviewing <span className="text-[#111827] dark:text-white">{requisitions.length} active allocation requests</span>.
          </p>
        </div>
      </div>

      {/* Global Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-black p-3 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
        <div className="relative group flex-1 min-w-[200px] max-w-xs">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search01Icon className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search title or initiator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-[#f8faff] dark:bg-[#0a0a0a] border border-transparent dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-bold text-xs text-gray-900 dark:text-white placeholder:text-zinc-500"
          />
        </div>

        <input
          type="date"
          value={filterFromDate}
          onChange={(e) => {
            setFilterFromDate(e.target.value);
            setItemsDisplayed(9);
          }}
          className="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-[#f8faff] dark:bg-[#0a0a0a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-xs"
        />

        <input
          type="date"
          value={filterToDate}
          onChange={(e) => {
            setFilterToDate(e.target.value);
            setItemsDisplayed(9);
          }}
          className="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-[#f8faff] dark:bg-[#0a0a0a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-xs"
        />
        
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setItemsDisplayed(9);
              }}
              className={cn(
                "px-3 h-10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex-shrink-0 border",
                statusFilter === status 
                  ? "bg-white dark:bg-black border-emerald-600 text-emerald-600 shadow-md shadow-emerald-500/10" 
                  : "bg-[#f8faff] dark:bg-black border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
              )}
            >
              {formatStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Requisition Pile */}
      <div className="grid grid-cols-1 gap-4">
        {displayedItems.map((req) => (
          <div key={req.id} className="group relative bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-white/10 rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/5">
            <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#f8faff] dark:bg-black rounded-2xl border border-gray-50 dark:border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-emerald-600 uppercase">REQ</span>
                    <span className="text-lg font-black text-[#111827] dark:text-white tabular-nums">#{req.id}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="px-2 py-0.5 bg-zinc-100 dark:bg-white/5 rounded text-[8px] font-black text-zinc-500 uppercase tracking-widest">{req.userDepartment || 'Ops'}</span>
                       <span className="text-[10px] font-bold text-zinc-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xl font-black text-[#111827] dark:text-white tracking-tight">{req.title}</h3>
                    <p className="text-sm font-bold text-zinc-500 italic lowercase tracking-tight">Initiated by {req.userName}</p>
                  </div>
               </div>

               <div className="flex flex-wrap items-center gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total Value</span>
                    <span className="text-2xl font-black text-emerald-600 tabular-nums">KES {req.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  
                  <div className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                    req.status === 'APPROVED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                    req.status === 'DENIED' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                    "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
                  )}>
                      {formatStatusLabel(req.status)}
                  </div>

                  <button 
                    onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                    className="w-12 h-12 bg-[#f8faff] dark:bg-black border border-gray-100 dark:border-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-emerald-600 transition-all"
                  >
                    <ArrowDown01Icon className={cn("w-5 h-5 transition-transform", expandedId === req.id && "rotate-180")} />
                  </button>
               </div>
            </div>

            {expandedId === req.id && (
              <div className="px-8 pb-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-gray-100 dark:border-white/5">
                   {/* Items List */}
                   <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                        <ShoppingBasket01Icon className="w-3.5 h-3.5" /> Items Breakdown
                      </h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {req.items.map((item, idx) => {
                          const rowTotal = item.quantity * item.unitPrice * (item.vatInclusive ? 1.16 : 1);
                          return (
                            <div key={idx} className="p-4 bg-[#f8faff] dark:bg-black rounded-2xl border border-gray-50 dark:border-white/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-black text-[#111827] dark:text-white">{item.itemName}</p>
                                  <p className="text-[10px] text-zinc-500 font-bold">Qty: {item.quantity} @ KES {item.unitPrice.toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer text-[10px]">
                                  <input type="checkbox" checked={item.vatInclusive} readOnly className="w-3 h-3 accent-emerald-600" />
                                  <span className="font-bold text-zinc-500">VAT (16%)</span>
                                </label>
                                <span className="text-[11px] font-black text-emerald-600 tabular-nums">
                                  KES {rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Grand Total */}
                      <div className="p-4 bg-emerald-50/30 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between">
                        <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Grand Total</span>
                        <span className="text-lg font-black text-emerald-600 tabular-nums">
                          KES {req.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                   </div>

                   {/* Audit Context */}
                   <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                          <SquareLock02Icon className="w-3.5 h-3.5" /> Justification
                        </h4>
                        <div className="p-6 bg-[#f8faff] dark:bg-black rounded-2xl border border-gray-50 dark:border-white/5 text-sm text-zinc-500 leading-relaxed font-medium">
                          <MarkdownRenderer content={req.reason} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
                        </div>
                      </div>

                      {/* Manager approval console */}
                       {isManagerReviewer && req.status === 'PENDING_MANAGER' && (
                        <div className="space-y-4 pt-4">
                           <RichTextEditor
                            value={actionNote}
                            onChange={setActionNote}
                            placeholder="Manager review notes or rejection reason..."
                            height={120}
                            compact
                           />
                           <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => handleApprove(req.id)}
                                disabled={loading}
                                className="h-14 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                              >
                                <CheckmarkCircle01Icon className="w-4 h-4" /> Approve & Send to Finance
                              </button>
                              <button
                                onClick={() => handleDeny(req.id)}
                                disabled={loading}
                                className="h-14 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                              >
                                <Cancel01Icon className="w-4 h-4" /> Reject
                              </button>
                           </div>
                        </div>
                      )}

                      {/* Manager waiting badge */}
                      {isManagerReviewer && req.status !== 'PENDING_MANAGER' && (
                        <div className="pt-4">
                          <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-2xl">
                            <Clock01Icon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Under {req.status.replaceAll('_', ' ')} Stage</span>
                          </div>
                        </div>
                      )}

                      {/* Finance approval console */}
                       {isFinanceReviewer && req.status === 'PENDING_FINANCE' && (
                        <div className="space-y-4 pt-4">
                           <RichTextEditor
                            value={actionNote}
                            onChange={setActionNote}
                            placeholder="Audit notes or rejection reason..."
                            height={120}
                            compact
                           />
                           <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => handleApprove(req.id)}
                                disabled={loading}
                                className="h-14 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                              >
                                <CheckmarkCircle01Icon className="w-4 h-4" /> Final Approve
                              </button>
                              <button 
                                onClick={() => handleDeny(req.id)}
                                disabled={loading}
                                className="h-14 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                              >
                                <Cancel01Icon className="w-4 h-4" /> Reject
                              </button>
                           </div>
                        </div>
                      )}

                      {/* Finance waiting badge */}
                      {isFinanceReviewer && req.status !== 'PENDING_FINANCE' && (
                        <div className="pt-4">
                          <div className="flex items-center gap-3 p-4 bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-2xl">
                            <Clock01Icon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Awaiting Earlier Approval Stage</span>
                          </div>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => setItemsDisplayed((prev) => prev + 9)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all active:scale-95"
          >
            Load More ({itemsDisplayed} of {filtered.length})
          </button>
        </div>
      )}
    </div>
  );
}
