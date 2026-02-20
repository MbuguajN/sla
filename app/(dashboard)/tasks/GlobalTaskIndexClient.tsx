'use client'

import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import {
    MessageCircle,
    Clock,
    ExternalLink,
    ClipboardList,
    Search,
    Hash
} from 'lucide-react'
import SLACountdown from '@/components/SLACountdown'
import ExportCSVButton from '@/components/ExportCSVButton'
import { cn } from '@/lib/utils'

export default function GlobalTaskIndexClient({ initialTasks }: { initialTasks: any[] }) {
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE')

    const filteredTasks = useMemo(() => {
        return initialTasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                t.id.toString().includes(search)

            if (!matchesSearch) return false

            if (activeTab === 'ACTIVE') {
                return t.status !== 'COMPLETED'
            } else {
                return t.status === 'COMPLETED'
            }
        })
    }, [initialTasks, search, activeTab])

    // Sort by SLA urgency
    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a: any, b: any) => {
            const tierPriority: Record<string, number> = { 'URGENT': 0, 'STANDARD': 1, 'LOW': 2 }
            return (tierPriority[a.sla.tier] ?? 3) - (tierPriority[b.sla.tier] ?? 3)
        })
    }, [filteredTasks])

    // Prepare export data
    const exportData = sortedTasks.map((t: any) => ({
        ID: `NX-${t.id}`,
        Title: t.title,
        Assignee: t.assignee?.name || 'Unassigned',
        SLA: t.sla.name,
        Tier: t.sla.tier,
        Status: t.status,
        CreatedAt: new Date(t.createdAt).toISOString(),
        DueAt: t.dueAt ? new Date(t.dueAt).toISOString() : 'N/A'
    }))

    return (
        <div className="space-y-8 animate-in fade-in duration-500 p-6 lg:p-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 shadow-xl shadow-primary/5">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-base-content tracking-tight leading-none">Global Task Overview</h1>
                        <p className="text-xs font-medium text-base-content/40 mt-2">Monitoring {initialTasks.filter(t => t.status !== 'COMPLETED').length} active service commitments</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            className="input input-bordered w-full pl-12 bg-base-100 border-base-300 font-medium text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all h-12"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <ExportCSVButton data={exportData} filename="Global_Task_Export" />
                </div>
            </div>

            <div className="flex items-center gap-2 border-b border-base-200 px-2 bg-base-100/30 backdrop-blur-md sticky top-0 z-20">
                <button
                    onClick={() => setActiveTab('ACTIVE')}
                    className={cn(
                        "px-6 py-4 text-xs font-bold transition-all relative",
                        activeTab === 'ACTIVE' ? "text-primary" : "text-base-content/30 hover:text-base-content/50"
                    )}
                >
                    Active Directives
                    {activeTab === 'ACTIVE' && <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(var(--p),0.4)]" />}
                </button>
                <button
                    onClick={() => setActiveTab('COMPLETED')}
                    className={cn(
                        "px-6 py-4 text-xs font-bold transition-all relative",
                        activeTab === 'COMPLETED' ? "text-success" : "text-base-content/30 hover:text-base-content/50"
                    )}
                >
                    Completed Archives
                    {activeTab === 'COMPLETED' && <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-success rounded-t-full" />}
                </button>
            </div>

            <div className="card bg-base-100 shadow-2xl border border-base-200 overflow-hidden rounded-[2rem]">

                {/* Desktop View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="table w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-base-200/40">
                                <th className="py-7 pl-10 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/50 border-b border-base-200">Directive / Reference</th>
                                <th className="py-7 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/50 border-b border-base-200">Personnel Allocation</th>
                                <th className="py-7 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/50 border-b border-base-200">SLA Timeline</th>
                                <th className="py-7 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/50 border-b border-base-200">Operational Status</th>
                                <th className="py-7 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/50 border-b border-base-200">Intelligence</th>
                                <th className="py-7 text-right pr-10 border-b border-base-200"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTasks.map((task: any) => {
                                const lastMessage = task.messages?.[0]
                                const isCompleted = task.status === 'COMPLETED'

                                return (
                                    <tr key={task.id} className="hover:bg-primary/[0.03] transition-colors group">
                                        <td className="py-4 pl-10 border-b border-base-100">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-sm text-base-content group-hover:text-primary transition-colors tracking-tight">{task.title}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="badge badge-sm bg-base-200/50 border-none text-[10px] font-bold px-2 h-4 flex items-center justify-center rounded-md text-base-content/60">
                                                        {task.sla.name}
                                                    </span>
                                                    <div className="flex items-center gap-1 opacity-10">
                                                        <Hash className="w-2.5 h-2.5" />
                                                        <span className="font-mono text-[10px] font-bold tracking-tighter">{task.id.toString().padStart(4, '0')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 border-b border-base-100">
                                            <div className="flex items-center gap-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-primary/5 text-primary rounded-full w-8 h-8 border border-primary/20 shadow-sm grid place-items-center">
                                                        <span className="text-[10px] font-bold leading-none">{task.assignee?.name?.charAt(0) || '?'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold uppercase tracking-tight text-base-content/80">{task.assignee?.name || 'Awaiting Resource'}</span>
                                                    <span className="text-[8px] font-semibold opacity-30 uppercase tracking-[0.15em]">{task.assignee ? 'Operator' : 'Pool Asset'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 border-b border-base-100">
                                            {task.dueAt && (
                                                <div className="scale-75 origin-left">
                                                    <SLACountdown dueDate={new Date(task.dueAt)} isCompleted={isCompleted} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 border-b border-base-100">
                                            <div className={cn(
                                                "badge badge-sm font-bold text-[8px] uppercase tracking-wide h-5 px-3 border-none shadow-sm",
                                                task.status === 'COMPLETED' ? "bg-success/15 text-success" :
                                                    task.status === 'IN_PROGRESS' ? "bg-primary/10 text-primary" :
                                                        "bg-base-200/50 text-base-content/40"
                                            )}>
                                                {task.status.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td className="py-4 border-b border-base-100">
                                            <div className="flex items-center gap-3 group/msg relative cursor-help">
                                                <div className="w-8 h-8 rounded-lg bg-base-200/50 flex items-center justify-center border border-base-300/50 group-hover/msg:border-primary/20 transition-all">
                                                    <MessageCircle className="w-3.5 h-3.5 text-base-content/30 group-hover/msg:opacity-100 group-hover/msg:text-primary transition-all" />
                                                </div>
                                                <div className="text-[9px] font-medium text-base-content/40 max-w-[120px] truncate italic tracking-tight">
                                                    {lastMessage ? `"${lastMessage.content}"` : 'No recent logs'}
                                                </div>
                                                {lastMessage && (
                                                    <div className="absolute bottom-full left-0 mb-3 p-6 bg-base-100 border border-base-200 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-80 hidden group-hover/msg:block z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/60">Intelligence Report</div>
                                                            <span className="text-[9px] font-mono opacity-20">REF-{task.id}</span>
                                                        </div>
                                                        <p className="text-sm font-medium text-base-content/80 leading-relaxed italic">"{lastMessage.content}"</p>
                                                        <div className="h-px bg-base-100 my-4" />
                                                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-30 flex items-center gap-2">
                                                            <Clock className="w-3 h-3" />
                                                            {format(new Date(lastMessage.createdAt), 'PP | HH:mm')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-7 text-right pr-10 border-b border-base-100">
                                            <Link href={`/tasks/${task.id}`} className="btn btn-ghost btn-sm rounded-xl h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-all">
                                                <ExternalLink className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile / Tablet View */}
                <div className="lg:hidden divide-y divide-base-100">
                    {sortedTasks.map((task: any) => {
                        const isCompleted = task.status === 'COMPLETED'
                        return (
                            <div key={task.id} className="p-8 space-y-6">
                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex flex-col gap-2">
                                        <Link href={`/tasks/${task.id}`} className="font-bold text-lg text-base-content leading-tight group-hover:text-primary transition-colors">
                                            {task.title}
                                        </Link>
                                        <div className="flex items-center gap-3">
                                            <span className="badge badge-sm bg-base-300/30 border-none font-bold uppercase tracking-wider text-xs px-3 rounded-md">{task.sla.name}</span>
                                            <span className="text-[10px] font-mono font-bold opacity-30">#{task.id}</span>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "badge badge-sm font-bold p-3 h-7 text-xs uppercase tracking-wider border-none shadow-sm",
                                        task.status === 'COMPLETED' ? "bg-success/15 text-success" :
                                            task.status === 'IN_PROGRESS' ? "bg-primary/15 text-primary" :
                                                "bg-base-200/50 text-base-content/50"
                                    )}>
                                        {task.status.replace('_', ' ')}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-base-200/30 rounded-2xl border border-base-200">
                                    <div className="flex items-center gap-3">
                                        <div className="avatar placeholder">
                                            <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 border border-base-300 grid place-items-center">
                                                <span className="text-xs font-bold leading-none">{task.assignee?.name?.charAt(0) || '?'}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-tight">{task.assignee?.name || 'Unassigned'}</span>
                                    </div>
                                    <div className="scale-75 origin-right">
                                        {task.dueAt && <SLACountdown dueDate={new Date(task.dueAt)} isCompleted={isCompleted} />}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {sortedTasks.length === 0 && (
                    <div className="py-32 text-center opacity-10 border-t border-base-200">
                        <ClipboardList className="w-20 h-20 mx-auto mb-4 stroke-[1]" />
                        <span className="text-2xl font-bold uppercase tracking-wider">Grid Silent</span>
                    </div>
                )}
            </div>
        </div>
    )
}
