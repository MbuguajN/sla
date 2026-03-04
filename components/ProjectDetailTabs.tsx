'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { FolderOpen, ClipboardList, Clock, CheckCircle2, GitBranch } from 'lucide-react'
import Link from 'next/link'
import SubProjectCard from './SubProjectCard'
import NewSubProjectClient from './NewSubProjectClient'

type Task = {
    id: number
    title: string
    status: string
    assignee?: { id: number; name: string | null } | null
    sla?: { name: string } | null
}

type SubProjectData = {
    id: number
    title: string
    description: string | null
    status: string
    projectId: number
    parentId: number | null
    createdBy: { id: number; name: string | null }
    _count: { tasks: number; children: number }
}

type TabId = 'subprojects' | 'tasks'

export default function ProjectDetailTabs({
    projectId,
    subProjects,
    directTasks,
    canCreateSub
}: {
    projectId: number
    subProjects: SubProjectData[]
    directTasks: Task[]
    canCreateSub: boolean
}) {
    const [activeTab, setActiveTab] = useState<TabId>('subprojects')

    const ongoingTasks = directTasks.filter(t => t.status !== 'COMPLETED')
    const completedTasks = directTasks.filter(t => t.status === 'COMPLETED')

    const tabs = [
        { id: 'subprojects' as TabId, label: 'Sub-Projects', icon: FolderOpen, count: subProjects.length },
        { id: 'tasks' as TabId, label: 'Direct Tasks', icon: ClipboardList, count: directTasks.length },
    ]

    return (
        <div className="space-y-6">
            {/* Tab Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 p-1 bg-base-200/50 rounded-xl w-fit">
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                    activeTab === tab.id
                                        ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                                        : "text-base-content/40 hover:text-base-content/60"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                                <span className={cn(
                                    "ml-1 px-1.5 py-0.5 rounded-md text-[9px]",
                                    activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-base-300 text-base-content/40"
                                )}>
                                    {tab.count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'subprojects' && (
                <div className="space-y-6">
                    {/* Create button */}
                    {canCreateSub && (
                        <NewSubProjectClient projectId={projectId} />
                    )}

                    {subProjects.length === 0 ? (
                        <div className="p-16 border-2 border-dashed border-base-200 rounded-3xl flex flex-col items-center justify-center opacity-40 text-center">
                            <FolderOpen className="w-10 h-10 mb-3" />
                            <h4 className="text-sm font-bold uppercase tracking-wider">No Sub-Projects Yet</h4>
                            <p className="text-xs font-normal mt-1 max-w-[200px]">
                                {canCreateSub ? 'Create the first sub-project to organize work.' : 'No sub-projects have been created for this project.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subProjects.map(sub => (
                                <SubProjectCard key={sub.id} sub={sub} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'tasks' && (
                <div className="space-y-4">
                    {directTasks.length === 0 ? (
                        <div className="p-16 border-2 border-dashed border-base-200 rounded-3xl flex flex-col items-center justify-center opacity-40 text-center">
                            <ClipboardList className="w-10 h-10 mb-3" />
                            <h4 className="text-sm font-bold uppercase tracking-wider">No Direct Tasks</h4>
                            <p className="text-xs font-normal mt-1 max-w-[250px]">Tasks created at the project level (not inside sub-projects) will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {/* Ongoing Tasks */}
                            {ongoingTasks.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-base-content/30 flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> Ongoing ({ongoingTasks.length})
                                    </h4>
                                    {ongoingTasks.map(task => (
                                        <TaskRow key={task.id} task={task} />
                                    ))}
                                </div>
                            )}

                            {/* Completed Tasks */}
                            {completedTasks.length > 0 && (
                                <div className="space-y-2 mt-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-success/50 flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3" /> Completed ({completedTasks.length})
                                    </h4>
                                    {completedTasks.map(task => (
                                        <TaskRow key={task.id} task={task} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function TaskRow({ task }: { task: Task }) {
    return (
        <Link
            href={`/tasks/${task.id}`}
            className="flex items-center justify-between p-4 bg-base-100 border border-base-200 rounded-2xl hover:border-primary/40 transition-all group shadow-sm hover:shadow-md"
        >
            <div className="flex items-center gap-4">
                <div className={cn(
                    "w-1.5 h-10 rounded-full",
                    task.status === 'COMPLETED' ? "bg-success" : task.status === 'IN_PROGRESS' ? "bg-primary" : "bg-base-300"
                )} />
                <div>
                    <h4 className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{task.title}</h4>
                    <div className="flex items-center gap-3 mt-1 opacity-60">
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-base-200 flex items-center justify-center leading-none text-base-content overflow-hidden">
                                <span className="text-[8px] font-black">{(task.assignee?.name || 'U').charAt(0)}</span>
                            </div>
                            <span className="text-[11px] font-bold">{task.assignee?.name || 'Unassigned'}</span>
                        </div>
                        {task.sla && (
                            <span className="text-[11px] font-bold px-2 py-0.5 bg-base-200/50 rounded-lg border border-base-300/50 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-primary/60" />
                                {task.sla.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                task.status === 'COMPLETED' ? "bg-success/5 border-success/20 text-success" :
                    task.status === 'IN_PROGRESS' ? "bg-primary/5 border-primary/20 text-primary" :
                        "bg-base-200 border-base-300 text-base-content/40"
            )}>
                {task.status.replace('_', ' ')}
            </div>
        </Link>
    )
}
