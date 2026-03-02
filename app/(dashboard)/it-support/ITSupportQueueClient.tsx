'use client'

import React, { useState, useMemo } from 'react'
import { assignITRequest, resolveITRequest } from '@/app/actions/itSupportActions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Monitor, Search, User, CheckCircle2, UserPlus, Clock, AlertCircle, HelpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type ITRequest = {
    id: number
    title: string
    description: string
    priority: string
    status: string
    createdAt: string
    user: { id: number, name: string | null, email: string, department: { name: string } | null }
    assignedTo: { id: number, name: string | null } | null
}

export default function ITSupportQueueClient({ initialRequests, techUsers }: { initialRequests: ITRequest[], techUsers: any[] }) {
    const [tab, setTab] = useState('OPEN')
    const [search, setSearch] = useState('')
    const [processing, setProcessing] = useState<number | null>(null)
    const [assigningId, setAssigningId] = useState<number | null>(null)
    const router = useRouter()

    const filtered = useMemo(() => {
        let result = initialRequests.filter(r => tab === 'ALL' ? true : r.status === tab)
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(r =>
                r.title.toLowerCase().includes(q) ||
                r.description.toLowerCase().includes(q) ||
                r.user.name?.toLowerCase().includes(q)
            )
        }
        return result
    }, [initialRequests, tab, search])

    async function handleAssign(id: number, userId: number) {
        setProcessing(id)
        try {
            await assignITRequest(id, userId)
            setAssigningId(null)
            router.refresh()
        } catch (err) {
            console.error(err)
        } finally {
            setProcessing(null)
        }
    }

    async function handleResolve(id: number) {
        setProcessing(id)
        try {
            await resolveITRequest(id)
            router.refresh()
        } catch (err) {
            console.error(err)
        } finally {
            setProcessing(null)
        }
    }

    const priorityStyles: Record<string, string> = {
        LOW: 'bg-base-content/5 text-base-content/40',
        NORMAL: 'bg-info/10 text-info',
        HIGH: 'bg-warning/10 text-warning',
        URGENT: 'bg-error text-white shadow-sm'
    }

    const statusStyles: Record<string, string> = {
        OPEN: 'bg-warning/10 text-warning',
        IN_PROGRESS: 'bg-primary/10 text-primary',
        RESOLVED: 'bg-success/10 text-success',
        CLOSED: 'bg-base-content/5 text-base-content/40'
    }

    return (
        <div className="space-y-6">
            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1.5 bg-base-content/5 rounded-2xl overflow-x-auto no-scrollbar">
                    {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                                tab === t ? "bg-white dark:bg-primary/10 text-primary shadow-sm" : "text-base-content/30 hover:text-base-content/50"
                            )}
                        >
                            {t.replace('_', ' ')} <span className="ml-1 text-[10px] opacity-50">{t === 'ALL' ? initialRequests.length : initialRequests.filter(r => r.status === t).length}</span>
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                    <input
                        type="text"
                        placeholder="Search tickets..."
                        className="input input-sm input-bordered pl-9 w-full md:w-60 text-sm bg-base-100"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Queue Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(r => (
                    <div key={r.id} className="glass-panel group p-6 rounded-3xl flex flex-col space-y-4 relative overflow-hidden transition-all hover:scale-[1.01] border border-transparent hover:border-primary/10">
                        {/* Priority Line */}
                        <div className={cn("absolute top-0 left-0 w-full h-1", r.priority === 'URGENT' ? 'bg-error' : r.priority === 'HIGH' ? 'bg-warning' : 'bg-primary/20')} />

                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <span className={cn("badge badge-sm font-bold text-[10px] uppercase tracking-wider border-none", priorityStyles[r.priority])}>
                                    {r.priority}
                                </span>
                                <span className="text-[10px] text-base-content/30 font-bold uppercase tracking-widest">{format(new Date(r.createdAt), 'MMM d, HH:mm')}</span>
                            </div>
                            <span className={cn("badge badge-sm font-bold text-[10px] uppercase tracking-wider border-none", statusStyles[r.status])}>
                                {r.status.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-base-content group-hover:text-primary transition-colors leading-tight">{r.title}</h3>
                            <p className="text-xs text-base-content/50 line-clamp-2">{r.description}</p>
                        </div>

                        <div className="pt-4 flex items-center justify-between border-t border-base-content/5 mt-auto">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-base-content/5 flex items-center justify-center text-[10px] font-black text-base-content/40">
                                    {r.user.name?.charAt(0) || '?'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-base-content/70">{r.user.name}</span>
                                    <span className="text-[9px] text-base-content/30 uppercase tracking-tighter">{r.user.department?.name || 'User'}</span>
                                </div>
                            </div>

                            {r.assignedTo ? (
                                <div className="flex items-center gap-2 text-xs text-primary font-bold">
                                    <User className="w-3.5 h-3.5" />
                                    <span>{r.assignedTo.name}</span>
                                </div>
                            ) : (
                                <span className="text-[11px] text-warning font-black uppercase tracking-widest">Unassigned</span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center gap-2">
                            {r.status === 'OPEN' ? (
                                <div className="w-full">
                                    {assigningId === r.id ? (
                                        <select
                                            className="select select-xs select-bordered w-full"
                                            onChange={(e) => handleAssign(r.id, Number(e.target.value))}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Assign to...</option>
                                            {techUsers.map((u: any) => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <button
                                            onClick={() => setAssigningId(r.id)}
                                            className="btn btn-xs btn-primary gap-1 w-full"
                                        >
                                            <UserPlus className="w-3 h-3" /> Assign
                                        </button>
                                    )}
                                </div>
                            ) : r.status === 'IN_PROGRESS' ? (
                                <button
                                    onClick={() => handleResolve(r.id)}
                                    disabled={processing === r.id}
                                    className="btn btn-xs btn-success gap-1 w-full text-white"
                                >
                                    <CheckCircle2 className="w-3 h-3" /> Resolve
                                </button>
                            ) : (
                                <div className="text-[10px] text-base-content/20 italic w-full text-center">Ticket Closed</div>
                            )}
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-16 h-16 bg-base-content/5 rounded-3xl flex items-center justify-center text-base-content/20 mx-auto mb-4">
                            <HelpCircle className="w-8 h-8" />
                        </div>
                        <p className="text-sm text-base-content/40 italic">No tickets found in this state</p>
                    </div>
                )}
            </div>
        </div>
    )
}

