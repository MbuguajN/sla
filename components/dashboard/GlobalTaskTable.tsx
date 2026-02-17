'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
    ArrowUpRight,
    CheckCircle2,
    Clock,
    MoreHorizontal,
    Play,
    AlertOctagon,
    ArrowUpDown,
    Search
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { TaskStatus } from '@/lib/enums'
import SLACountdown from '@/components/SLACountdown'
import { advanceTaskStatus } from '@/app/actions/taskActions'

type Task = {
    id: number
    title: string
    status: TaskStatus
    priority: string | null // inferred from SLA tier usually
    dueAt: Date | null
    project: { id: number, title: string } | null
    assignee: { name: string | null, avatarUrl: string | null } | null
    sla: { tier: string, name: string }
}

export default function GlobalTaskTable({ initialTasks }: { initialTasks: any[] }) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
    const [filter, setFilter] = useState('')
    const [processingId, setProcessingId] = useState<number | null>(null)

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedTasks = useMemo(() => {
        let sortableItems = [...tasks]
        if (sortConfig !== null) {
            sortableItems.sort((a: any, b: any) => {
                let aValue = a[sortConfig.key]
                let bValue = b[sortConfig.key]

                // Handle nested properties
                if (sortConfig.key === 'project') {
                    aValue = a.project?.title || ''
                    bValue = b.project?.title || ''
                }
                if (sortConfig.key === 'sla') {
                    // Custom sort for tier?
                    aValue = a.sla.tier
                    bValue = b.sla.tier
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1
                }
                return 0
            })
        }

        if (filter) {
            const lowerFilter = filter.toLowerCase()
            sortableItems = sortableItems.filter(t =>
                t.title.toLowerCase().includes(lowerFilter) ||
                t.project?.title.toLowerCase().includes(lowerFilter) ||
                t.assignee?.name?.toLowerCase().includes(lowerFilter)
            )
        }

        return sortableItems
    }, [tasks, sortConfig, filter])

    const handleQuickAction = async (task: Task) => {
        let nextStatus: TaskStatus | null = null
        if (task.status === TaskStatus.PENDING) nextStatus = TaskStatus.RECEIVED
        else if (task.status === TaskStatus.RECEIVED) nextStatus = TaskStatus.IN_PROGRESS
        else if (task.status === TaskStatus.IN_PROGRESS) nextStatus = TaskStatus.REVIEW
        else if (task.status === TaskStatus.REVIEW) nextStatus = TaskStatus.COMPLETED

        if (nextStatus) {
            setProcessingId(task.id)
            try {
                await advanceTaskStatus(task.id, nextStatus)
                // Optimistic update
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus! } : t))
            } catch (error) {
                console.error("Failed to update task", error)
            } finally {
                setProcessingId(null)
            }
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case TaskStatus.PENDING: return "badge-ghost"
            case TaskStatus.RECEIVED: return "badge-info"
            case TaskStatus.IN_PROGRESS: return "badge-primary"
            case TaskStatus.REVIEW: return "badge-warning"
            case TaskStatus.COMPLETED: return "badge-success"
            default: return "badge-ghost"
        }
    }

    return (
        <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Header Toolbar */}
            <div className="p-4 border-b border-base-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-black uppercase tracking-tight">Active Directives</h2>
                    <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">Global Task Registry</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    <input
                        type="text"
                        placeholder="Search directives..."
                        className="input input-sm input-bordered pl-9 w-full md:w-64 text-xs font-bold"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="table w-full">
                    <thead>
                        <tr className="bg-base-200/40 text-[9px] font-black uppercase tracking-widest text-base-content/50">
                            <th className="pl-6 py-4 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('title')}>
                                <div className="flex items-center gap-1">Directive <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('project')}>
                                <div className="flex items-center gap-1">Project <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th>SLA Target</th>
                            <th className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="text-right pr-6">Quick Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-100">
                        {sortedTasks.map(task => {
                            const isProcessing = processingId === task.id
                            const isUrgent = task.sla.tier === 'URGENT'

                            return (
                                <tr key={task.id} className="group hover:bg-base-200/30 transition-colors">
                                    <td className="pl-6 py-3">
                                        <div className="flex flex-col gap-1">
                                            <Link href={`/tasks/${task.id}`} className="font-bold text-sm text-base-content hover:text-primary transition-colors flex items-center gap-2">
                                                {task.title}
                                                {isUrgent && <AlertOctagon className="w-3 h-3 text-error" />}
                                            </Link>
                                            <span className="text-[9px] font-mono opacity-40">#{task.id}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {task.project ? (
                                            <Link href={`/projects/${task.project.id}`} className="badge badge-sm badge-ghost font-bold text-[9px] hover:bg-base-200">
                                                {task.project.title}
                                            </Link>
                                        ) : (
                                            <span className="opacity-30 text-[9px]">—</span>
                                        )}
                                    </td>
                                    <td>
                                        {task.dueAt && (
                                            <div className="flex flex-col">
                                                <SLACountdown dueDate={task.dueAt} isCompleted={task.status === TaskStatus.COMPLETED} />
                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-30 mt-0.5">
                                                    {format(new Date(task.dueAt), 'MMM d, HH:mm')}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className={cn(
                                            "badge badge-xs font-bold h-5 px-2 text-[8px] uppercase tracking-tighter gap-1",
                                            getStatusColor(task.status)
                                        )}>
                                            {task.status.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td className="text-right pr-6">
                                        {task.status !== TaskStatus.COMPLETED && (
                                            <button
                                                onClick={() => handleQuickAction(task)}
                                                disabled={isProcessing}
                                                className="btn btn-xs btn-outline border-base-200 hover:border-primary hover:bg-primary hover:text-white font-bold uppercase tracking-wider text-[9px] h-7 min-h-7 gap-1"
                                            >
                                                {isProcessing ? (
                                                    <span className="loading loading-spinner loading-xs"></span>
                                                ) : (
                                                    <>
                                                        {task.status === TaskStatus.PENDING && 'Confirm'}
                                                        {task.status === TaskStatus.RECEIVED && 'Start'}
                                                        {task.status === TaskStatus.IN_PROGRESS && 'Review'}
                                                        {task.status === TaskStatus.REVIEW && 'Complete'}
                                                        <Play className="w-2 h-2 ml-0.5" />
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {sortedTasks.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-base-content/30 text-xs font-bold uppercase tracking-widest">
                                    No directives found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-2 border-t border-base-200 bg-base-200/20 text-center">
                <Link href="/tasks" className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">
                    View Full Registry
                </Link>
            </div>
        </div>
    )
}
