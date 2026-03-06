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
            return activeTab === 'ACTIVE' ? t.status !== 'COMPLETED' : t.status === 'COMPLETED'
        })
    }, [initialTasks, search, activeTab])

    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a: any, b: any) => {
            const tierPriority: Record<string, number> = { 'URGENT': 0, 'STANDARD': 1, 'LOW': 2 }
            return (tierPriority[a.sla.tier] ?? 3) - (tierPriority[b.sla.tier] ?? 3)
        })
    }, [filteredTasks])

    const exportData = sortedTasks.map((t: any) => ({
        ID: `#${t.id}`,
        Title: t.title,
        Assignee: t.assignee?.name || 'Unassigned',
        SLA: t.sla.name,
        Tier: t.sla.tier,
        Status: t.status,
        CreatedAt: new Date(t.createdAt).toISOString(),
        DueAt: t.dueAt ? new Date(t.dueAt).toISOString() : 'N/A'
    }))

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-base-content tracking-tight">Tasks</h1>
                        <p className="text-sm text-base-content/40 mt-0.5">
                            {initialTasks.filter(t => t.status !== 'COMPLETED').length} active tasks
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            className="input input-bordered input-sm w-full pl-9 bg-base-100 text-sm h-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <ExportCSVButton data={exportData} filename="Task_Export" />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-base-200">
                <button
                    onClick={() => setActiveTab('ACTIVE')}
                    className={cn(
                        "px-4 py-3 text-sm font-medium transition-colors relative",
                        activeTab === 'ACTIVE' ? "text-primary" : "text-base-content/40 hover:text-base-content/60"
                    )}
                >
                    Active
                    {activeTab === 'ACTIVE' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('COMPLETED')}
                    className={cn(
                        "px-4 py-3 text-sm font-medium transition-colors relative",
                        activeTab === 'COMPLETED' ? "text-success" : "text-base-content/40 hover:text-base-content/60"
                    )}
                >
                    Completed
                    {activeTab === 'COMPLETED' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-success rounded-t-full" />}
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-base-100 border border-base-content/10 rounded-xl overflow-hidden shadow-md">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-base-200/40 text-left">
                                <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider">Task</th>
                                <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider">Assignee</th>
                                <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider">Deadline</th>
                                <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider">Last Update</th>
                                <th className="px-6 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-200/60">
                            {sortedTasks.map((task: any) => {
                                const lastMessage = task.messages?.[0]
                                const isCompleted = task.status === 'COMPLETED'

                                return (
                                    <tr key={task.id} className="group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm text-base-content">{task.title}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-base-content/30">#{task.id}</span>
                                                    <span className="text-xs text-base-content/30">·</span>
                                                    <span className="text-xs text-base-content/40">{task.sla.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                                    <span className="text-[10px] font-semibold">{task.assignee?.name?.charAt(0) || '?'}</span>
                                                </div>
                                                <span className="text-sm text-base-content/70">{task.assignee?.name || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.dueAt && (
                                                <SLACountdown dueDate={new Date(task.dueAt)} isCompleted={isCompleted} />
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium",
                                                task.status === 'COMPLETED' ? "bg-success/10 text-success" :
                                                    task.status === 'IN_PROGRESS' ? "bg-primary/10 text-primary" :
                                                        task.status === 'REVIEW' ? "bg-warning/10 text-warning" :
                                                            "bg-base-200 text-base-content/50"
                                            )}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lastMessage ? (
                                                <div className="group/msg relative cursor-help">
                                                    <div className="flex items-center gap-2">
                                                        <MessageCircle className="w-3.5 h-3.5 text-base-content/25" />
                                                        <span className="text-xs text-base-content/40 max-w-[140px] truncate italic">
                                                            {lastMessage.content}
                                                        </span>
                                                    </div>
                                                    <div className="absolute bottom-full left-0 mb-2 p-4 bg-base-100 border border-base-200 rounded-xl shadow-lg w-72 hidden group-hover/msg:block z-50">
                                                        <p className="text-sm text-base-content/70 italic mb-2">"{lastMessage.content}"</p>
                                                        <div className="flex items-center gap-1.5 text-xs text-base-content/30">
                                                            <Clock className="w-3 h-3" />
                                                            {format(new Date(lastMessage.createdAt), 'PP · HH:mm')}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-base-content/20">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/tasks/${task.id}`} className="btn btn-ghost btn-sm btn-circle hover:bg-primary/10 hover:text-primary">
                                                <ExternalLink className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden divide-y divide-base-200">
                    {sortedTasks.map((task: any) => {
                        const isCompleted = task.status === 'COMPLETED'
                        return (
                            <div key={task.id} className="p-5 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <Link href={`/tasks/${task.id}`} className="font-medium text-sm text-base-content">
                                            {task.title}
                                        </Link>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-base-content/30">#{task.id}</span>
                                            <span className="text-xs text-base-content/40">{task.sla.name}</span>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium shrink-0",
                                        task.status === 'COMPLETED' ? "bg-success/10 text-success" :
                                            task.status === 'IN_PROGRESS' ? "bg-primary/10 text-primary" :
                                                "bg-base-200 text-base-content/50"
                                    )}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between bg-base-200/30 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                            <span className="text-[9px] font-semibold">{task.assignee?.name?.charAt(0) || '?'}</span>
                                        </div>
                                        <span className="text-xs text-base-content/60">{task.assignee?.name || 'Unassigned'}</span>
                                    </div>
                                    {task.dueAt && <SLACountdown dueDate={new Date(task.dueAt)} isCompleted={isCompleted} />}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {sortedTasks.length === 0 && (
                    <div className="py-20 text-center">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-base-content/10" />
                        <span className="text-sm text-base-content/30">No tasks found</span>
                    </div>
                )}
            </div>
        </div>
    )
}
