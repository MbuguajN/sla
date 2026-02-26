'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
    ArrowUpRight,
    CheckCircle2,
    Clock,
    Play,
    AlertOctagon,
    ArrowUpDown,
    Search,
    ChevronRight
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
    priority: string | null
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
                if (sortConfig.key === 'project') {
                    aValue = a.project?.title || ''
                    bValue = b.project?.title || ''
                }
                if (sortConfig.key === 'sla') {
                    aValue = a.sla.tier
                    bValue = b.sla.tier
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
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
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus! } : t))
            } catch (error) {
                console.error("Failed to update task", error)
            } finally {
                setProcessingId(null)
            }
        }
    }

    const getStatusBadge = (status: string) => {
        const map: Record<string, { bg: string; text: string; label: string }> = {
            [TaskStatus.PENDING]: { bg: 'bg-base-200', text: 'text-base-content/60', label: 'Pending' },
            [TaskStatus.RECEIVED]: { bg: 'bg-info/10', text: 'text-info', label: 'Received' },
            [TaskStatus.IN_PROGRESS]: { bg: 'bg-primary/10', text: 'text-primary', label: 'In Progress' },
            [TaskStatus.REVIEW]: { bg: 'bg-warning/10', text: 'text-warning', label: 'Review' },
            [TaskStatus.COMPLETED]: { bg: 'bg-success/10', text: 'text-success', label: 'Completed' },
        }
        return map[status] || { bg: 'bg-base-200', text: 'text-base-content/60', label: status }
    }

    const getActionLabel = (status: string) => {
        switch (status) {
            case TaskStatus.PENDING: return 'Acknowledge'
            case TaskStatus.RECEIVED: return 'Start'
            case TaskStatus.IN_PROGRESS: return 'Submit'
            case TaskStatus.REVIEW: return 'Complete'
            default: return ''
        }
    }

    return (
        <div className="bg-base-100 border border-base-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-base-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-base-content">Active Tasks</h2>
                    <p className="text-sm text-base-content/40 mt-0.5">{sortedTasks.length} tasks requiring attention</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        className="input input-sm input-bordered pl-9 w-full md:w-60 text-sm bg-base-100"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-base-200/50 text-left">
                            <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('title')}>
                                <div className="flex items-center gap-1">Task <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('project')}>
                                <div className="flex items-center gap-1">Project <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider">Deadline</th>
                            <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-6 py-3 text-xs font-medium text-base-content/50 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200/60">
                        {sortedTasks.map(task => {
                            const isProcessing = processingId === task.id
                            const isUrgent = task.sla.tier === 'URGENT'
                            const statusBadge = getStatusBadge(task.status)

                            return (
                                <tr key={task.id} className="group">
                                    <td className="px-6 py-4">
                                        <Link href={`/tasks/${task.id}`} className="font-medium text-sm text-base-content hover:text-primary transition-colors flex items-center gap-2">
                                            {task.title}
                                            {isUrgent && <AlertOctagon className="w-3.5 h-3.5 text-error shrink-0" />}
                                        </Link>
                                        <span className="text-xs text-base-content/30 mt-0.5 block">#{task.id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {task.project ? (
                                            <Link href={`/projects/${task.project.id}`} className="text-sm text-base-content/60 hover:text-primary transition-colors">
                                                {task.project.title}
                                            </Link>
                                        ) : (
                                            <span className="text-sm text-base-content/20">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {task.dueAt && (
                                            <div className="flex flex-col gap-0.5">
                                                <SLACountdown dueDate={task.dueAt} isCompleted={task.status === TaskStatus.COMPLETED} />
                                                <span className="text-xs text-base-content/30">
                                                    {format(new Date(task.dueAt), 'MMM d, HH:mm')}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium",
                                            statusBadge.bg, statusBadge.text
                                        )}>
                                            {statusBadge.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {task.status !== TaskStatus.COMPLETED && (
                                            <button
                                                onClick={() => handleQuickAction(task)}
                                                disabled={isProcessing}
                                                className="btn btn-sm btn-ghost text-primary hover:bg-primary/10 font-medium text-xs gap-1"
                                            >
                                                {isProcessing ? (
                                                    <span className="loading loading-spinner loading-xs"></span>
                                                ) : (
                                                    <>
                                                        {getActionLabel(task.status)}
                                                        <ChevronRight className="w-3 h-3" />
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
                                <td colSpan={5} className="py-12 text-center text-sm text-base-content/30">
                                    No tasks found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-3 border-t border-base-200 bg-base-200/20">
                <Link href="/tasks" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                    View all tasks <ArrowUpRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    )
}
