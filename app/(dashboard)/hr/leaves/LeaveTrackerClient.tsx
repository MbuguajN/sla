'use client'

import React, { useState, useMemo } from 'react'
import { reviewLeaveRequest } from '@/app/actions/hrActions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, Clock, Search, CalendarDays, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Leave = {
    id: number
    type: string
    startDate: string
    endDate: string
    reason: string
    status: string
    reviewNote: string | null
    createdAt: string
    user: { id: number, name: string | null, email: string, department: { name: string } | null }
    reviewer: { name: string | null } | null
}

export default function LeaveTrackerClient({ initialLeaves, userRole }: { initialLeaves: Leave[], userRole: string }) {
    const [tab, setTab] = useState('PENDING')
    const [search, setSearch] = useState('')
    const [processing, setProcessing] = useState<number | null>(null)
    const [reviewNote, setReviewNote] = useState('')
    const [reviewingId, setReviewingId] = useState<number | null>(null)
    const router = useRouter()

    const filtered = useMemo(() => {
        let result = initialLeaves.filter(l => l.status === tab)
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(l =>
                l.user.name?.toLowerCase().includes(q) ||
                l.type.toLowerCase().includes(q) ||
                l.reason.toLowerCase().includes(q)
            )
        }
        return result
    }, [initialLeaves, tab, search])

    async function handleReview(id: number, status: 'APPROVED' | 'DENIED') {
        setProcessing(id)
        try {
            await reviewLeaveRequest(id, status, reviewNote || undefined)
            setReviewingId(null)
            setReviewNote('')
            router.refresh()
        } catch (err) {
            console.error(err)
            alert('Failed to update leave request')
        } finally {
            setProcessing(null)
        }
    }

    const statusStyles: Record<string, { bg: string, text: string }> = {
        PENDING: { bg: 'bg-warning/10', text: 'text-warning' },
        APPROVED: { bg: 'bg-success/10', text: 'text-success' },
        DENIED: { bg: 'bg-error/10', text: 'text-error' }
    }

    return (
        <div className="space-y-6">
            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1.5 bg-base-content/5 rounded-2xl">
                    {['PENDING', 'APPROVED', 'DENIED'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                                tab === t ? "bg-white dark:bg-primary/10 text-primary shadow-sm" : "text-base-content/30 hover:text-base-content/50"
                            )}
                        >
                            {t} <span className="ml-1 text-[10px] opacity-50">{initialLeaves.filter(l => l.status === t).length}</span>
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="input input-sm input-bordered pl-9 w-full md:w-60 text-sm bg-base-100"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th className="rounded-tl-2xl">Employee</th>
                                <th>Type</th>
                                <th>Period</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th className="rounded-tr-2xl">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(leave => (
                                <tr key={leave.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                                {leave.user.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-base-content">{leave.user.name}</p>
                                                <p className="text-[10px] text-base-content/30 uppercase tracking-wider">{leave.user.department?.name || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-sm bg-base-content/5 text-base-content/60 border-none font-bold text-[10px] uppercase tracking-wider">{leave.type}</span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5 text-xs text-base-content/60">
                                            <CalendarDays className="w-3.5 h-3.5 text-base-content/30" />
                                            {format(new Date(leave.startDate), 'MMM d')} — {format(new Date(leave.endDate), 'MMM d, yyyy')}
                                        </div>
                                    </td>
                                    <td>
                                        <p className="text-sm text-base-content/60 max-w-[200px] truncate">{leave.reason}</p>
                                    </td>
                                    <td>
                                        <span className={cn("badge badge-sm font-bold text-[10px] uppercase tracking-wider border-none whitespace-nowrap", statusStyles[leave.status]?.bg, statusStyles[leave.status]?.text)}>
                                            {leave.status}
                                        </span>
                                    </td>
                                    <td>
                                        {leave.status === 'PENDING' && (userRole === 'HR' || userRole === 'ADMIN') ? (
                                            <div className="flex items-center gap-2">
                                                {reviewingId === leave.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Note (optional)"
                                                            className="input input-xs input-bordered w-32"
                                                            value={reviewNote}
                                                            onChange={e => setReviewNote(e.target.value)}
                                                        />
                                                        <button
                                                            onClick={() => handleReview(leave.id, 'APPROVED')}
                                                            disabled={processing === leave.id}
                                                            className="btn btn-xs btn-success gap-1 text-white"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" /> Yes
                                                        </button>
                                                        <button
                                                            onClick={() => handleReview(leave.id, 'DENIED')}
                                                            disabled={processing === leave.id}
                                                            className="btn btn-xs btn-error gap-1 text-white"
                                                        >
                                                            <XCircle className="w-3 h-3" /> No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setReviewingId(leave.id)}
                                                        className="btn btn-xs btn-ghost text-primary hover:bg-primary/10 font-bold"
                                                    >
                                                        Review
                                                    </button>
                                                )}
                                            </div>
                                        ) : leave.status !== 'PENDING' && leave.reviewer ? (
                                            <span className="text-xs text-base-content/30">by {leave.reviewer.name}</span>
                                        ) : (
                                            <span className="text-xs text-base-content/20">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-sm text-base-content/30 italic">No {tab.toLowerCase()} leave requests</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
