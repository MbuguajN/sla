'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ClipboardList, CheckCircle2, Clock } from 'lucide-react'

type Task = {
    id: number
    title: string
    status: string
    assignee?: { name: string | null } | null
    sla?: { name: string } | null
}

export default function ProjectTaskTabs({ tasks }: { tasks: Task[] }) {
    const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing')

    const ongoingTasks = tasks.filter(t => t.status !== 'COMPLETED')
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED')

    const displayTasks = activeTab === 'ongoing' ? ongoingTasks : completedTasks

    return (
        <div className="space-y-6">
            {/* Tabs Header */}
            <div className="flex items-center gap-1 p-1 bg-base-200/50 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('ongoing')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                        activeTab === 'ongoing'
                            ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                            : "text-base-content/40 hover:text-base-content/60"
                    )}
                >
                    <Clock className="w-3.5 h-3.5" />
                    Ongoing
                    <span className={cn(
                        "ml-1 px-1.5 py-0.5 rounded-md text-[9px]",
                        activeTab === 'ongoing' ? "bg-primary/10 text-primary" : "bg-base-300 text-base-content/40"
                    )}>
                        {ongoingTasks.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                        activeTab === 'completed'
                            ? "bg-white dark:bg-slate-900 text-success shadow-sm"
                            : "text-base-content/40 hover:text-base-content/60"
                    )}
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                    <span className={cn(
                        "ml-1 px-1.5 py-0.5 rounded-md text-xs font-bold",
                        activeTab === 'completed' ? "bg-success/10 text-success" : "bg-base-300 text-base-content/40"
                    )}>
                        {completedTasks.length}
                    </span>
                </button>
            </div>

            {/* Tasks Grid */}
            <div className="grid gap-3">
                {displayTasks.length === 0 ? (
                    <div className="p-16 border-2 border-dashed border-base-200 rounded-3xl flex flex-col items-center justify-center opacity-40 text-center">
                        <ClipboardList className="w-10 h-10 mb-3" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">No {activeTab} status detected</h4>
                        <p className="text-xs font-normal mt-1 max-w-[200px]">Strategic directives for this segment are currently null or pending initialization.</p>
                    </div>
                ) : (
                    displayTasks.map(task => (
                        <Link
                            key={task.id}
                            href={`/tasks/${task.id}`}
                            className="flex items-center justify-between p-5 bg-base-100 border border-base-200 rounded-2xl hover:border-primary/40 transition-all group shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "w-1.5 h-12 rounded-full",
                                    task.status === 'COMPLETED' ? "bg-success" : task.status === 'IN_PROGRESS' ? "bg-primary" : "bg-base-300"
                                )} />
                                <div>
                                    <h4 className="font-bold text-base tracking-tight group-hover:text-primary transition-colors">{task.title}</h4>
                                    <div className="flex items-center gap-4 mt-1.5 opacity-60">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-4 h-4 rounded-full bg-base-200 flex items-center justify-center text-xs font-bold">
                                                {(task.assignee?.name || 'U').charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold">{task.assignee?.name || 'Unassigned'}</span>
                                        </div>
                                        {task.sla && (
                                            <span className="text-xs font-bold px-2.5 py-1 bg-base-200/50 rounded-lg border border-base-300/50 flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-primary/60" />
                                                {task.sla.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                                    task.status === 'COMPLETED' ? "bg-success/5 border-success/20 text-success" :
                                        task.status === 'IN_PROGRESS' ? "bg-primary/5 border-primary/20 text-primary" :
                                            "bg-base-200 border-base-300 text-base-content/40"
                                )}>
                                    {task.status.replace('_', ' ')}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
