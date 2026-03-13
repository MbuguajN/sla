'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { assignITRequest, resolveITRequest } from '@/app/actions/itSupportActions'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { Monitor, Search, User, CheckCircle2, UserPlus, Clock, AlertCircle, HelpCircle, ArrowRight, Loader2, Badge, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

type ITRequest = {
    id: number
    title: string
    description: string
    priority: string
    status: string
    createdAt: string
    user: { id: number, name: string | null, email: string, department: { name: string } | null }
    assignedTo: { id: number, name: string | null } | null
    resolvedAt?: string
}

export default function ITSupportQueueClient({ initialRequests, techUsers }: { initialRequests: ITRequest[], techUsers: any[] }) {
    const [requests, setRequests] = useState<ITRequest[]>(initialRequests)
    const [tab, setTab] = useState('ALL')
    const [search, setSearch] = useState('')
    const [processingId, setProcessingId] = useState<number | null>(null)
    const [assigningId, setAssigningId] = useState<number | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    useRealtimeRefresh(10000)

    const filtered = useMemo(() => {
        let result = requests.filter(r => tab === 'ALL' ? true : r.status === tab)
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(r =>
                r.title.toLowerCase().includes(q) ||
                r.description.toLowerCase().includes(q) ||
                r.user.name?.toLowerCase().includes(q) ||
                r.user.email.toLowerCase().includes(q)
            )
        }
        return result.sort((a, b) => {
            // Priority sort
            const priorityMap = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }
            const aPriority = priorityMap[a.priority as keyof typeof priorityMap] ?? 3
            const bPriority = priorityMap[b.priority as keyof typeof priorityMap] ?? 3
            if (aPriority !== bPriority) return aPriority - bPriority
            // Date sort (newest first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
    }, [requests, tab, search])

    // Group by status for Kanban view
    const kanbanColumns = useMemo(() => {
        return {
            OPEN: filtered.filter(r => r.status === 'OPEN'),
            IN_PROGRESS: filtered.filter(r => r.status === 'IN_PROGRESS'),
            RESOLVED: filtered.filter(r => r.status === 'RESOLVED')
        }
    }, [filtered])

    async function handleAssign(id: number, userId: number) {
        setProcessingId(id)
        startTransition(async () => {
            try {
                await assignITRequest(id, userId)
                setAssigningId(null)
                router.refresh()
            } catch (err) {
                const errorMsg = (err as Error).message
                if (errorMsg.includes('tech manager')) {
                    alert('Only the tech manager can assign tickets')
                } else if (errorMsg.includes('TECHNOLOGY')) {
                    alert('Assignee must be in TECHNOLOGY department')
                } else {
                    alert('Failed to assign request')
                }
            } finally {
                setProcessingId(null)
            }
        })
    }

    async function handleResolve(id: number) {
        setProcessingId(id)
        startTransition(async () => {
            try {
                await resolveITRequest(id)
                router.refresh()
            } catch (err) {
                const errorMsg = (err as Error).message
                if (errorMsg.includes('assigned person')) {
                    alert('Only the assigned person can resolve this ticket')
                } else {
                    alert('Failed to resolve request')
                }
            } finally {
                setProcessingId(null)
            }
        })
    }

    const stats = {
        total: requests.length,
        open: requests.filter(r => r.status === 'OPEN').length,
        inProgress: requests.filter(r => r.status === 'IN_PROGRESS').length,
        resolved: requests.filter(r => r.status === 'RESOLVED').length
    }

    const priorityConfig = {
        URGENT: { bg: 'bg-error/15', text: 'text-error', border: 'border-error/30', icon: '🔴', badge: 'badge-error' },
        HIGH: { bg: 'bg-warning/15', text: 'text-warning', border: 'border-warning/30', icon: '🟠', badge: 'badge-warning' },
        NORMAL: { bg: 'bg-info/15', text: 'text-info', border: 'border-info/30', icon: '🔵', badge: 'badge-info' },
        LOW: { bg: 'bg-base-content/10', text: 'text-base-content/70', border: 'border-base-content/20', icon: '⚪', badge: 'badge-ghost' }
    }

    const statusConfig = {
        OPEN: { bg: 'bg-warning/10', text: 'text-warning', label: 'Open' },
        IN_PROGRESS: { bg: 'bg-primary/10', text: 'text-primary', label: 'In Progress' },
        RESOLVED: { bg: 'bg-success/10', text: 'text-success', label: 'Resolved' }
    }

    const TicketCard = ({ request }: { request: ITRequest }) => {
        const priority = priorityConfig[request.priority as keyof typeof priorityConfig] || priorityConfig.NORMAL
        const status = statusConfig[request.status as keyof typeof statusConfig]
        const timeInStatus = formatDistanceToNow(new Date(request.createdAt), { addSuffix: false })

        return (
            <div className={cn(
                "group rounded-2xl border-2 transition-all hover:shadow-lg",
                "bg-base-100 p-5",
                `border-l-4 ${priority.border}`,
                "flex flex-col space-y-3"
            )}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn("text-lg font-black", priority.text)}>{priority.icon}</span>
                            <span className={cn("text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border", priority.bg, priority.text, priority.border)}>
                                {request.priority}
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-base-content line-clamp-2 group-hover:text-primary transition-colors">
                            {request.title}
                        </h3>
                    </div>
                    <span className={cn("text-xs font-black uppercase tracking-wider px-2 py-1 rounded-lg whitespace-nowrap", status.bg, status.text)}>
                        {status.label}
                    </span>
                </div>

                {/* Description */}
                <p className="text-xs text-base-content/70 line-clamp-2">
                    {request.description}
                </p>

                {/* Metadata */}
                <div className="pt-2 border-t border-base-content/10 space-y-2">
                    {/* Time Info */}
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-base-content/60">
                            <Clock className="w-3 h-3" />
                            <span>{timeInStatus} ago</span>
                        </div>
                        <span className="text-base-content/40 font-bold">{format(new Date(request.createdAt), 'MMM d, HH:mm')}</span>
                    </div>

                    {/* Submitter Info */}
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white",
                            "bg-gradient-to-br from-primary to-secondary"
                        )}>
                            {request.user.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-base-content truncate">{request.user.name}</p>
                            <p className="text-[10px] text-base-content/50 truncate">{request.user.department?.name}</p>
                        </div>
                    </div>

                    {/* Assignment Status */}
                    {request.assignedTo ? (
                        <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-2">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold text-primary">{request.assignedTo.name}</span>
                        </div>
                    ) : (
                        request.status === 'OPEN' && (
                            <div className="bg-warning/5 rounded-lg p-2">
                                <p className="text-xs font-black text-warning uppercase tracking-wider">Unassigned</p>
                            </div>
                        )
                    )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-2">
                    {request.status === 'OPEN' && (
                        assigningId === request.id ? (
                            <select
                                className="select select-sm select-bordered flex-1 text-xs"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleAssign(request.id, Number(e.target.value))
                                    }
                                }}
                                defaultValue=""
                                autoFocus
                            >
                                <option value="" disabled>Assign to...</option>
                                {techUsers.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        ) : (
                            <button
                                onClick={() => setAssigningId(request.id)}
                                disabled={processingId === request.id}
                                className="btn btn-sm btn-primary gap-1 flex-1 text-xs"
                            >
                                {processingId === request.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <UserPlus className="w-3.5 h-3.5" />
                                )}
                                Assign
                            </button>
                        )
                    )}

                    {request.status === 'IN_PROGRESS' && (
                        <button
                            onClick={() => handleResolve(request.id)}
                            disabled={processingId === request.id}
                            className="btn btn-sm btn-success gap-1 flex-1 text-white text-xs"
                        >
                            {processingId === request.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Resolve
                        </button>
                    )}

                    {request.status === 'RESOLVED' && (
                        <div className="flex-1 text-center py-1 bg-success/10 rounded-lg">
                            <p className="text-xs font-bold text-success uppercase tracking-wider">✓ Closed</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Top Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Tab Navigation */}
                <div className="flex items-center gap-2 p-1 bg-base-content/5 rounded-2xl overflow-x-auto no-scrollbar">
                    {[
                        { id: 'OPEN', label: 'Open', count: stats.open, icon: AlertCircle },
                        { id: 'IN_PROGRESS', label: 'Working', count: stats.inProgress, icon: Zap },
                        { id: 'RESOLVED', label: 'Resolved', count: stats.resolved, icon: CheckCircle2 },
                        { id: 'ALL', label: 'All', count: stats.total, icon: Monitor }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2",
                                tab === t.id
                                    ? "bg-primary text-white shadow-lg scale-105"
                                    : "text-base-content/60 hover:text-base-content/80 hover:bg-base-content/10"
                            )}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                            <span className={cn(
                                "text-xs font-black px-2 py-0.5 rounded-full",
                                tab === t.id ? "bg-white/20 text-white" : "bg-base-content/10 text-base-content/70"
                            )}>{t.count}</span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative flex-1 lg:flex-none lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    <input
                        type="text"
                        placeholder="Search by title, user, email..."
                        className="input input-bordered w-full pl-10 text-sm bg-base-100 focus:ring-primary"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {tab === 'ALL' ? (
                    // Kanban View
                    <>
                        {/* OPEN Column */}
                        <div className="rounded-2xl bg-gradient-to-br from-warning/5 to-base-100 border-2 border-warning/20 overflow-hidden flex flex-col">
                            <div className="bg-warning/10 px-4 py-3 border-b border-warning/20">
                                <h3 className="text-sm font-black text-warning uppercase tracking-wider flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Open ({kanbanColumns.OPEN.length})
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[600px]">
                                {kanbanColumns.OPEN.length > 0 ? (
                                    kanbanColumns.OPEN.map(r => <TicketCard key={r.id} request={r} />)
                                ) : (
                                    <div className="text-center py-8 text-base-content/40">
                                        <Badge className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs font-bold uppercase tracking-wider">No open tickets</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* IN_PROGRESS Column */}
                        <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-base-100 border-2 border-primary/20 overflow-hidden flex flex-col">
                            <div className="bg-primary/10 px-4 py-3 border-b border-primary/20">
                                <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    In Progress ({kanbanColumns.IN_PROGRESS.length})
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[600px]">
                                {kanbanColumns.IN_PROGRESS.length > 0 ? (
                                    kanbanColumns.IN_PROGRESS.map(r => <TicketCard key={r.id} request={r} />)
                                ) : (
                                    <div className="text-center py-8 text-base-content/40">
                                        <Zap className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs font-bold uppercase tracking-wider">No tickets in progress</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RESOLVED Column */}
                        <div className="rounded-2xl bg-gradient-to-br from-success/5 to-base-100 border-2 border-success/20 overflow-hidden flex flex-col">
                            <div className="bg-success/10 px-4 py-3 border-b border-success/20">
                                <h3 className="text-sm font-black text-success uppercase tracking-wider flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Resolved ({kanbanColumns.RESOLVED.length})
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[600px]">
                                {kanbanColumns.RESOLVED.length > 0 ? (
                                    kanbanColumns.RESOLVED.map(r => <TicketCard key={r.id} request={r} />)
                                ) : (
                                    <div className="text-center py-8 text-base-content/40">
                                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs font-bold uppercase tracking-wider">No resolved tickets</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    // List View
                    filtered.length > 0 ? (
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map(r => (
                                <TicketCard key={r.id} request={r} />
                            ))}
                        </div>
                    ) : (
                        <div className="lg:col-span-3 py-20 text-center">
                            <div className="w-20 h-20 bg-base-content/5 rounded-3xl flex items-center justify-center text-base-content/40 mx-auto mb-6">
                                <HelpCircle className="w-10 h-10" />
                            </div>
                            <h3 className="text-base font-bold text-base-content mb-2">No tickets found</h3>
                            <p className="text-sm text-base-content/60">Try adjusting your search or select a different status</p>
                        </div>
                    )
                )}
            </div>
        </div>
    )
}

