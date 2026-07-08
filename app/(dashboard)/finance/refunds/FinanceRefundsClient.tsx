"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  approveRefundAsFinance,
  rejectRefundAsFinance,
} from "@/app/actions/financeActions";
import RichTextEditor from "@/components/RichTextEditor";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { CreditCardIcon, Search01Icon, Cancel01Icon, CheckmarkCircle01Icon, ArrowDown01Icon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

type Refund = {
  id: number;
  amount: number;
  reason: string;
  receiptUrls: string[];
  status: string;
  userName: string;
  userDepartment: string | null;
  financeNote: string | null;
  ceoNote: string | null;
  createdAt: string;
};

interface Props {
  initialRefunds: Refund[];
  currentUserRole: string;
}

function formatStatusLabel(status: string) {
  return status.split("_").join(" ");
}

export default function FinanceRefundsClient({ initialRefunds, currentUserRole }: Props) {
  const router = useRouter();
  const [refunds, setRefunds] = useState(initialRefunds);
  useEffect(() => { setRefunds(initialRefunds); }, [initialRefunds]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [itemsDisplayed, setItemsDisplayed] = useState(9);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [loading, setLoading] = useState(false);
  const isViewOnly = currentUserRole === "ADMIN";

  const handleApprove = async (refundId: number) => {
    setLoading(true);
    try {
      await approveRefundAsFinance(refundId, actionNote || undefined);
      setRefunds(prev => prev.map(r => r.id === refundId ? { ...r, status: "APPROVED" } : r));
      setActionNote("");
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve refund");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async (refundId: number) => {
    setLoading(true);
    try {
      await rejectRefundAsFinance(refundId, actionNote || "Denied");
      setRefunds(prev => prev.map(r => r.id === refundId ? { ...r, status: "DENIED" } : r));
      setActionNote("");
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject refund");
    } finally {
      setLoading(false);
    }
  };

  const filtered = refunds.filter((r) => {
    const matchSearch = r.userName.toLowerCase().includes(search.toLowerCase()) || r.reason.toLowerCase().includes(search.toLowerCase());
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

  const statuses = ["ALL", "PENDING_FINANCE", "APPROVED", "DENIED"];

  return (
    <div className="max-w-[1600px] mx-auto pb-20 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-white/10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
              <CreditCardIcon className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-[11px] font-black text-rose-600 uppercase tracking-[0.2em] leading-none">Financial Requests</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[#111827] dark:text-white leading-none">
            Refund <span className="text-rose-600 italic">Returns</span>
          </h1>
          <p className="text-[#9ca3af] dark:text-zinc-500 font-bold text-[13px] tracking-tight">
            Processing <span className="text-[#111827] dark:text-white">{refunds.length} refund requests</span>.
          </p>
        </div>
      </div>

      {/* Global Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 bg-white dark:bg-black p-4 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm">
        <div className="lg:col-span-2 relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search01Icon className="w-4.5 h-4.5 text-gray-400 group-focus-within:text-rose-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Filter by name or reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setItemsDisplayed(9);
            }}
            className="w-full h-14 pl-12 pr-6 bg-[#f8faff] dark:bg-[#0a0a0a] border border-transparent dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/5 transition-all font-bold text-sm text-gray-900 dark:text-white placeholder:text-zinc-700"
          />
        </div>

        <input
          type="date"
          value={filterFromDate}
          onChange={(e) => {
            setFilterFromDate(e.target.value);
            setItemsDisplayed(9);
          }}
          className="h-14 px-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-[#f8faff] dark:bg-[#0a0a0a] text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-rose-500/5 transition-all"
        />

        <input
          type="date"
          value={filterToDate}
          onChange={(e) => {
            setFilterToDate(e.target.value);
            setItemsDisplayed(9);
          }}
          className="h-14 px-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-[#f8faff] dark:bg-[#0a0a0a] text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-rose-500/5 transition-all"
        />
        
        <div className="lg:col-span-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setItemsDisplayed(9);
              }}
              className={cn(
                "px-5 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 border-2",
                statusFilter === status 
                  ? "bg-white dark:bg-black border-rose-600 text-rose-600 shadow-lg shadow-rose-500/10" 
                  : "bg-[#f8faff] dark:bg-black border-transparent text-zinc-600 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
              )}
            >
              {formatStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Refund Cards */}
      <div className="grid grid-cols-1 gap-4">
        {displayedItems.map((refund) => (
          <div key={refund.id} className="group relative bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-white/10 rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-rose-500/5">
            <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-[#f8faff] dark:bg-black rounded-2xl border border-gray-50 dark:border-white/5 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-black text-rose-600 uppercase">REF</span>
                  <span className="text-lg font-black text-[#111827] dark:text-white tabular-nums">#{refund.id}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-white/5 rounded text-[8px] font-black text-zinc-500 uppercase tracking-widest">{refund.userDepartment || 'Ops'}</span>
                    <span className="text-[10px] font-bold text-zinc-500">{new Date(refund.createdAt).toLocaleDateString()}</span>
                    {(refund.receiptUrls?.length || 0) > 0 ? (
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 rounded text-[8px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
                        {refund.receiptUrls.length} Receipt{refund.receiptUrls.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                   <div className="text-xl font-black text-[#111827] dark:text-white tracking-tight"><MarkdownRenderer content={refund.reason} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" /></div>
                  <p className="text-sm font-bold text-zinc-500 italic lowercase tracking-tight">Requested by {refund.userName}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-8">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Refund Amount</span>
                  <span className="text-2xl font-black text-rose-600 tabular-nums">KES {refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                <div className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                  refund.status === 'APPROVED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                  refund.status === 'DENIED' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                  "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
                )}>
                  {formatStatusLabel(refund.status)}
                </div>

                <button 
                  onClick={() => setExpandedId(expandedId === refund.id ? null : refund.id)}
                  className="w-12 h-12 bg-[#f8faff] dark:bg-black border border-gray-100 dark:border-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-rose-600 transition-all"
                >
                  <ArrowDown01Icon className={cn("w-5 h-5 transition-transform", expandedId === refund.id && "rotate-180")} />
                </button>
              </div>
            </div>

            {expandedId === refund.id && (
              <div className="px-8 pb-8 space-y-8 animate-in slide-in-from-top-4 duration-500 border-t border-gray-100 dark:border-white/5 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Reason */}
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Refund Reason</h4>
                    <div className="p-6 bg-[#f8faff] dark:bg-black rounded-2xl border border-gray-50 dark:border-white/5 text-sm text-zinc-500 leading-relaxed font-medium">
                      <MarkdownRenderer content={refund.reason} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
                    </div>
                    {refund.receiptUrls?.length ? (
                      <div className="p-4 bg-[#f8faff] dark:bg-black rounded-2xl border border-gray-50 dark:border-white/5 space-y-2">
                        <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Receipts</h4>
                        <div className="space-y-1">
                          {refund.receiptUrls.map((url, idx) => (
                            <a
                              key={`${refund.id}-${idx}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs font-bold text-rose-600 hover:text-rose-700 underline break-all"
                            >
                              {url.split("/").pop()}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Approval Console — Finance acting on PENDING_FINANCE */}
                  {!isViewOnly && refund.status === 'PENDING_FINANCE' && (
                    <div className="space-y-4">
                      <RichTextEditor
                        value={actionNote}
                        onChange={setActionNote}
                        placeholder="Audit notes or rejection reason..."
                        height={120}
                        compact
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleApprove(refund.id)}
                          disabled={loading}
                          className="h-14 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <CheckmarkCircle01Icon className="w-4 h-4" /> Approve
                        </button>
                        <button 
                          onClick={() => handleDeny(refund.id)}
                          disabled={loading}
                          className="h-14 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <Cancel01Icon className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  )}
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
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all active:scale-95"
          >
            Load More ({itemsDisplayed} of {filtered.length})
          </button>
        </div>
      )}
    </div>
  );
}
