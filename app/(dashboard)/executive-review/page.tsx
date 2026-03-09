'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { getCEORequisitions, updateRequisitionStatus } from '@/app/actions/financeActions'
import { format } from 'date-fns'
import {
    ShieldCheck, Eye, CheckCircle2, XCircle, Clock,
    ArrowUpRight, User, Calculator, Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { ReviewGridSkeleton } from '@/components/dashboard/DashboardSkeletons'

export default function CEOFinanceReviewPage() {
    const [requisitions, setRequisitions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
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
            const data = await getCEORequisitions()
            setRequisitions(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function handleStatusUpdate(id: number, status: 'APPROVED' | 'DENIED') {
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
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-ruby-soft rotate-3">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-base-content uppercase">Executive Review</h1>
                        <p className="text-sm font-medium text-base-content/60 italic">Strategic approval for pending purchase requisitions</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full">
                        <ReviewGridSkeleton />
                    </div>
                ) : requisitions.length === 0 ? (
                    <div className="col-span-full py-20 glass-panel rounded-3xl border-dashed border-2 border-base-content/10 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-base-content/5 rounded-full flex items-center justify-center text-base-content/20 mb-4">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-base-content/30 italic">No Pending Reviews</h3>
                        <p className="text-xs font-black uppercase tracking-widest text-base-content/20 mt-1">Clear operational queue</p>
                    </div>
                ) : requisitions.map((r: any) => (
                    <div key={r.id} className="glass-panel group p-6 rounded-[32px] border border-transparent hover:border-primary/20 transition-all hover:scale-[1.02] shadow-sm hover:shadow-xl">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">REQ #{r.id.toString().padStart(4, '0')}</span>
                                <h3 className="text-lg font-bold text-base-content">{r.user.name}</h3>
                                <span className="text-xs font-medium text-base-content/60">{r.user.role}</span>
                            </div>
                            <div className="badge badge-lg bg-info/10 text-info border-none font-black text-[10px] uppercase tracking-widest py-3">
                                Review Queue
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-base-content/40 font-bold uppercase tracking-widest text-[10px]">Primary Item</span>
                                <span className="font-bold text-base-content truncate max-w-[150px]">{r.items[0]?.itemName}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-base-content/40 font-bold uppercase tracking-widest text-[10px]">Total Value</span>
                                <span className="text-lg font-black text-primary">KES {r.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setSelectedReq(r)}
                                className="btn btn-primary h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 gap-2"
                            >
                                <Eye className="w-4 h-4" /> Strategic Review
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {selectedReq && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-base-100 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="p-10 space-y-8">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-primary text-white rounded-[20px] flex items-center justify-center shadow-ruby-soft">
                                        <ShieldCheck className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-base-content uppercase tracking-tight">Executive Approval</h3>
                                        <p className="text-sm font-bold text-base-content/40 uppercase tracking-widest">Decision Protocol REQ-{selectedReq.id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedReq(null)} className="btn btn-ghost btn-circle">
                                    <XCircle className="w-8 h-8 text-base-content/10" />
                                </button>
                            </div>

                            <div className="bg-base-content/5 p-6 rounded-3xl border border-base-content/5 space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-base-content/10">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-base-content/40">Requesting Intelligence</span>
                                        <span className="text-lg font-bold text-base-content">{selectedReq.user.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black uppercase text-base-content/40 text-right block">Financial Exposure</span>
                                        <span className="text-2xl font-black text-primary">KES {selectedReq.totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-base-content/40">Itemized Allocation</span>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                        {selectedReq.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm font-bold p-3 bg-base-100/50 rounded-xl">
                                                <span>{item.quantity}x {item.itemName}</span>
                                                <span className="text-primary tabular-nums">KES {(item.quantity * item.unitPrice * (item.vatInclusive ? 1 : 1.16)).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {selectedReq.reason && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-base-content/40">Strategic Context</span>
                                    <p className="text-sm font-medium text-base-content/70 italic leading-relaxed border-l-4 border-primary/20 pl-4 py-1">
                                        "{selectedReq.reason}"
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-base-content/40">Executive Note (Sent to Finance/Staff)</label>
                                <textarea
                                    className="textarea textarea-bordered w-full text-base font-bold bg-base-content/5 border-none focus:ring-2 ring-primary/20"
                                    rows={3}
                                    placeholder="Add decision context..."
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleStatusUpdate(selectedReq.id, 'DENIED')}
                                    disabled={submitting}
                                    className="btn h-16 rounded-[24px] bg-error/10 text-error hover:bg-error hover:text-white border-none flex-1 font-black uppercase tracking-widest text-sm transition-all"
                                >
                                    <XCircle className="w-5 h-5 mr-2" /> Strategic Denial
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(selectedReq.id, 'APPROVED')}
                                    disabled={submitting}
                                    className="btn h-16 rounded-[24px] bg-primary text-white hover:brightness-110 border-none flex-1 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all"
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" /> Authorize Final
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
