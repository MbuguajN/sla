'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { getAllRequisitions, updateRequisitionStatus } from '@/app/actions/financeActions'
import { format } from 'date-fns'
import {
    DollarSign, Eye, CheckCircle2, XCircle, Clock, AlertCircle,
    Filter, Search, ArrowUpRight, ChevronDown, User, MessageSquare,
    Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { FinanceBoardSkeleton } from '@/components/dashboard/DashboardSkeletons'

export default function FinanceDashboardPage() {
    const [requisitions, setRequisitions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('ALL')
    const [search, setSearch] = useState('')
    const [selectedReq, setSelectedReq] = useState<any>(null)
    const [note, setNote] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const router = useRouter()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        try {
            const data = await getAllRequisitions()
            setRequisitions(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const filtered = requisitions.filter(r => {
        const matchesStatus = filter === 'ALL' || r.status === filter
        const matchesSearch = r.user.name.toLowerCase().includes(search.toLowerCase()) ||
            r.items.some((i: any) => i.itemName.toLowerCase().includes(search.toLowerCase()))
        return matchesStatus && matchesSearch
    })

    async function handleStatusUpdate(id: number, status: 'APPROVED' | 'DENIED' | 'SENT_FOR_REVIEW') {
        setSubmitting(true)
        try {
            const res = await updateRequisitionStatus(id, status, note)
            if (res.success) {
                setSelectedReq(null)
                setNote('')
                loadData()
                router.refresh()
            } else {
                alert(res.error)
            }
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-ruby-soft">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-base-content uppercase">Finance Operations</h1>
                        <p className="text-sm font-medium text-base-content/60">Review and manage purchase requisitions</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-base-content/5 p-1 rounded-xl">
                    {['ALL', 'PENDING', 'SENT_FOR_REVIEW', 'APPROVED', 'DENIED'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === s ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-base-content/40 hover:text-base-content/60"
                            )}
                        >
                            {s.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="glass-panel rounded-3xl overflow-hidden border border-base-content/10">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="bg-base-content/5 border-b border-base-content/10">
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Requestor</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Details</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40 text-right">Total Amount</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Status</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-content/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-0">
                                        <FinanceBoardSkeleton />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-20 text-sm text-base-content/30 italic font-medium">No requisitions match the criteria</td>
                                </tr>
                            ) : filtered.map((r: any) => (
                                <tr key={r.id} className="hover:bg-base-content/[0.02] transition-colors group">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-base-content/5 flex items-center justify-center text-xs font-black text-base-content/40">
                                                {r.user.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-base-content">{r.user.name}</span>
                                                <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-tighter">{r.user.role}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-bold text-base-content">{r.items[0]?.itemName}</span>
                                            <span className="text-[10px] font-bold text-base-content/40 italic">
                                                {format(new Date(r.createdAt), 'MMM d, yyyy')} • {r.items.length} item(s)
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right font-black tabular-nums text-sm text-primary">
                                        KES {r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td>
                                        <span className={cn(
                                            "badge badge-sm font-black text-[10px] uppercase tracking-widest border-none px-2.5 h-6",
                                            r.status === 'PENDING' ? 'bg-warning/10 text-warning' :
                                                r.status === 'APPROVED' ? 'bg-success/10 text-success' :
                                                    r.status === 'SENT_FOR_REVIEW' ? 'bg-info/10 text-info' : 'bg-error/10 text-error'
                                        )}>
                                            {r.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => setSelectedReq(r)}
                                            className="btn btn-ghost btn-xs text-primary gap-1 font-black uppercase tracking-widest hover:bg-primary/10"
                                        >
                                            <Eye className="w-3 h-3" /> Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {selectedReq && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-base-100 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="p-8 space-y-8">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                        <ArrowUpRight className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-base-content uppercase">Requisition Details</h3>
                                        <p className="text-sm font-bold text-base-content/40 uppercase tracking-widest">ID: #REQ-{selectedReq.id.toString().padStart(4, '0')}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedReq(null)} className="btn btn-ghost btn-circle">
                                    <XCircle className="w-6 h-6 text-base-content/20" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30">Submitted By</span>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary" />
                                        <span className="font-bold text-base-content">{selectedReq.user.name}</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30">Total Value</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-black text-primary">KES {selectedReq.totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30">Items Overview</span>
                                <div className="bg-base-content/5 rounded-2xl overflow-hidden border border-base-content/10">
                                    <table className="table table-compact w-full">
                                        <thead className="bg-base-content/5">
                                            <tr>
                                                <th className="text-[10px] font-black uppercase">Item Name</th>
                                                <th className="text-[10px] font-black uppercase text-center">Qty</th>
                                                <th className="text-[10px] font-black uppercase text-right">Unit Price</th>
                                                <th className="text-[10px] font-black uppercase text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-base-content/5">
                                            {selectedReq.items.map((item: any, idx: number) => {
                                                const subtotal = item.quantity * item.unitPrice
                                                const total = item.vatInclusive ? subtotal : subtotal * 1.16
                                                return (
                                                    <tr key={idx} className="text-xs font-bold">
                                                        <td>{item.itemName}</td>
                                                        <td className="text-center">{item.quantity}</td>
                                                        <td className="text-right tabular-nums">KES {item.unitPrice.toLocaleString()}</td>
                                                        <td className="text-right tabular-nums text-primary">KES {total.toLocaleString()} {!item.vatInclusive && <span className="text-[8px] opacity-40">+VAT</span>}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {selectedReq.reason && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30">Business Reason</span>
                                    <p className="text-sm font-medium text-base-content/70 italic bg-base-content/5 p-4 rounded-2xl border border-base-content/5">
                                        "{selectedReq.reason}"
                                    </p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30">Internal Feedback / Note</label>
                                <textarea
                                    className="textarea textarea-bordered w-full text-sm font-bold"
                                    placeholder="Optional note to the requestor..."
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    onClick={() => handleStatusUpdate(selectedReq.id, 'DENIED')}
                                    disabled={submitting}
                                    className="btn border-error/20 bg-error/5 text-error hover:bg-error hover:text-white flex-1 h-12 rounded-2xl uppercase font-black text-xs tracking-widest gap-2"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(selectedReq.id, 'SENT_FOR_REVIEW')}
                                    disabled={submitting}
                                    className="btn border-info/20 bg-info/5 text-info hover:bg-info hover:text-white flex-1 h-12 rounded-2xl uppercase font-black text-xs tracking-widest gap-2"
                                >
                                    <Send className="w-4 h-4" /> Send to CEO
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(selectedReq.id, 'APPROVED')}
                                    disabled={submitting}
                                    className="btn btn-primary shadow-lg shadow-primary/20 flex-1 h-12 rounded-2xl uppercase font-black text-xs tracking-widest gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Final Approve
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
