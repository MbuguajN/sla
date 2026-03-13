'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { reviewLeaveRequest } from '@/app/actions/hrActions'
import { getLeavePolicies, saveLeavePolicies } from '@/app/actions/leavePolicyActions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, Clock, Search, CalendarDays, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

type Leave = {
    id: number
    type: string
    startDate: string
    endDate: string
    reason: string
    status: string
    reviewNote: string | null
    cancelledAt: string | null
    cancelledReason: string | null
    endedEarlyAt: string | null
    createdAt: string
    user: { id: number, name: string | null, email: string, department: { name: string } | null }
    reviewer: { name: string | null } | null
}

const ROLE_CATEGORIES = [
    { key: 'CEO', label: 'CEO / Directors', description: 'Top-level executives' },
    { key: 'MANAGER', label: 'Managers / Admin / HR', description: 'Department heads and administrators' },
    { key: 'EMPLOYEE', label: 'General Employees', description: 'Standard staff members' },
]

export default function LeaveTrackerClient({ initialLeaves, userRole }: { initialLeaves: Leave[], userRole: string }) {
    const [tab, setTab] = useState('PENDING')
    const [search, setSearch] = useState('')
    const [processing, setProcessing] = useState<number | null>(null)
    const [reviewNote, setReviewNote] = useState('')
    const [reviewingId, setReviewingId] = useState<number | null>(null)
    const router = useRouter()
    useRealtimeRefresh(10000)

    // Policy state
    const [policies, setPolicies] = useState(
        ROLE_CATEGORIES.map(r => ({ roleCategory: r.key, annualDays: 21, sickDays: 10, maternityDays: 90, paternityDays: 14 }))
    )
    const [savingPolicy, setSavingPolicy] = useState(false)
    const [policyMessage, setPolicyMessage] = useState<string | null>(null)

    useEffect(() => {
        if (tab === 'POLICY') {
            getLeavePolicies().then(existing => {
                if (existing.length > 0) {
                    setPolicies(prev =>
                        prev.map(p => {
                            const match = existing.find((e: any) => e.roleCategory === p.roleCategory)
                            return match ? { ...p, annualDays: (match as any).annualDays, sickDays: (match as any).sickDays, maternityDays: (match as any).maternityDays, paternityDays: (match as any).paternityDays } : p
                        })
                    )
                }
            })
        }
    }, [tab])

    const filtered = useMemo(() => {
        if (tab === 'POLICY') return []
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

    const handleSavePolicy = async () => {
        setSavingPolicy(true)
        setPolicyMessage(null)
        try {
            await saveLeavePolicies(policies)
            setPolicyMessage('Policies saved successfully')
            setTimeout(() => setPolicyMessage(null), 3000)
        } catch {
            setPolicyMessage('Failed to save')
        } finally {
            setSavingPolicy(false)
        }
    }

    const statusStyles: Record<string, { bg: string, text: string }> = {
        PENDING: { bg: 'bg-warning/10', text: 'text-warning' },
        APPROVED: { bg: 'bg-success/10', text: 'text-success' },
        DENIED: { bg: 'bg-error/10', text: 'text-error' },
        CANCELLED: { bg: 'bg-error/10', text: 'text-error' },
        ENDED_EARLY: { bg: 'bg-info/10', text: 'text-info' }
    }

    const tabs = ['PENDING', 'APPROVED', 'DENIED', 'POLICY']

    return (
        <div className="space-y-6">
            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1.5 bg-base-content/5 rounded-2xl">
                    {tabs.map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all",
                                tab === t ? "bg-white dark:bg-primary/10 text-primary shadow-sm" : "text-base-content/30 hover:text-base-content/70"
                            )}
                        >
                            {t === 'POLICY' ? (
                                <span className="flex items-center gap-1"><Settings2 className="w-3 h-3" /> Policy</span>
                            ) : (
                                <>{t} <span className="ml-1 text-sm opacity-50">{initialLeaves.filter(l => l.status === t).length}</span></>
                            )}
                        </button>
                    ))}
                </div>
                {tab !== 'POLICY' && (
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
                )}
            </div>

            {/* Policy Tab */}
            {tab === 'POLICY' ? (
                <div className="space-y-4">
                    <div className="bg-base-100 border border-base-content/10 rounded-2xl overflow-hidden shadow-sm">
                        <table className="table w-full">
                            <thead>
                                <tr className="bg-base-200/50 text-sm font-bold uppercase tracking-widest text-base-content/30 border-b border-base-content/20">
                                    <th className="pl-6 h-12">Role Category</th>
                                    <th>Annual Leave</th>
                                    <th>Sick Leave</th>
                                    <th>Maternity Leave</th>
                                    <th>Paternity Leave</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base-content/5">
                                {ROLE_CATEGORIES.map(role => {
                                    const policy = policies.find(p => p.roleCategory === role.key)!
                                    return (
                                        <tr key={role.key} className="hover:bg-base-content/[0.02]">
                                            <td className="pl-6">
                                                <p className="text-xs font-bold text-base-content">{role.label}</p>
                                                <p className="text-xs text-base-content/70">{role.description}</p>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="365"
                                                    className="input input-bordered input-sm w-20"
                                                    value={policy.annualDays}
                                                    onChange={e => setPolicies(prev => prev.map(p => p.roleCategory === role.key ? { ...p, annualDays: parseInt(e.target.value) || 0 } : p))}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="365"
                                                    className="input input-bordered input-sm w-20"
                                                    value={policy.sickDays}
                                                    onChange={e => setPolicies(prev => prev.map(p => p.roleCategory === role.key ? { ...p, sickDays: parseInt(e.target.value) || 0 } : p))}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="365"
                                                    className="input input-bordered input-sm w-20"
                                                    value={policy.maternityDays}
                                                    onChange={e => setPolicies(prev => prev.map(p => p.roleCategory === role.key ? { ...p, maternityDays: parseInt(e.target.value) || 0 } : p))}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="365"
                                                    className="input input-bordered input-sm w-20"
                                                    value={policy.paternityDays}
                                                    onChange={e => setPolicies(prev => prev.map(p => p.roleCategory === role.key ? { ...p, paternityDays: parseInt(e.target.value) || 0 } : p))}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSavePolicy} disabled={savingPolicy} className="btn btn-primary btn-sm font-bold uppercase tracking-widest text-sm">
                            {savingPolicy ? <span className="loading loading-spinner loading-xs" /> : 'Save Policies'}
                        </button>
                        {policyMessage && (
                            <span className="text-sm font-bold text-success uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {policyMessage}
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                /* Leave Requests Table */
                <div className="bg-base-100 border border-base-content/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr className="bg-base-200/50 text-sm font-bold uppercase tracking-widest text-base-content/30 border-b border-base-content/20">
                                    <th className="pl-6 h-12">Employee</th>
                                    <th>Type</th>
                                    <th>Period</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base-content/5">
                                {filtered.map(leave => (
                                    <tr key={leave.id} className="hover:bg-base-content/[0.02] transition-colors">
                                        <td className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                                    {leave.user.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-base-content">{leave.user.name}</p>
                                                    <p className="text-xs text-base-content/70 uppercase tracking-wider">{leave.user.department?.name || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-sm font-bold uppercase tracking-wider text-base-content/70">{leave.type}</span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1 text-sm text-base-content/70">
                                                <CalendarDays className="w-3 h-3 text-base-content/15" />
                                                {format(new Date(leave.startDate), 'MMM d')} — {format(new Date(leave.endDate), 'MMM d')}
                                            </div>
                                        </td>
                                        <td>
                                            <p className="text-sm text-base-content/70 max-w-[180px] truncate">{leave.reason}</p>
                                        </td>
                                        <td>
                                            <div className="space-y-1">
                                                <span className={cn("badge badge-sm font-bold text-xs uppercase tracking-wider border-none", statusStyles[leave.status]?.bg, statusStyles[leave.status]?.text)}>
                                                    {leave.status}
                                                </span>
                                                {leave.status === 'CANCELLED' && leave.cancelledAt && (
                                                    <div className="text-xs text-error/70">
                                                        Cancelled: {format(new Date(leave.cancelledAt), 'MMM d, yyyy')}
                                                    </div>
                                                )}
                                                {leave.cancelledReason && (
                                                    <div className="text-xs text-error/60 italic max-w-[150px] truncate">
                                                        {leave.cancelledReason}
                                                    </div>
                                                )}
                                                {leave.status === 'ENDED_EARLY' && leave.endedEarlyAt && (
                                                    <div className="text-xs text-info/70">
                                                        Ended: {format(new Date(leave.endedEarlyAt), 'MMM d, yyyy')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {leave.status === 'PENDING' && (userRole === 'HR' || userRole === 'ADMIN') ? (
                                                <div className="flex items-center gap-2">
                                                    {reviewingId === leave.id ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="text"
                                                                placeholder="Note..."
                                                                className="input input-xs input-bordered w-24"
                                                                value={reviewNote}
                                                                onChange={e => setReviewNote(e.target.value)}
                                                            />
                                                            <button onClick={() => handleReview(leave.id, 'APPROVED')} disabled={processing === leave.id} className="btn btn-xs btn-success text-white">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                            </button>
                                                            <button onClick={() => handleReview(leave.id, 'DENIED')} disabled={processing === leave.id} className="btn btn-xs btn-error text-white">
                                                                <XCircle className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setReviewingId(leave.id)} className="btn btn-xs btn-ghost text-primary hover:bg-primary/10 font-bold text-sm">
                                                            Review
                                                        </button>
                                                    )}
                                                </div>
                                            ) : leave.status !== 'PENDING' && leave.reviewer ? (
                                                <span className="text-sm text-base-content/70">by {leave.reviewer.name}</span>
                                            ) : (
                                                <span className="text-sm text-base-content/40">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-sm text-base-content/15 italic">No {tab.toLowerCase()} leave requests</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
