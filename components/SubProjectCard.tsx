'use client'

import React from 'react'
import Link from 'next/link'
import { FolderOpen, Layers, CheckCircle2, Clock, ArrowUpRight, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function SubProjectCard({ sub, isSublet = false }: { sub: SubProjectData; isSublet?: boolean }) {
    const taskCount = sub._count.tasks
    const childCount = sub._count.children
    const isCompleted = sub.status === 'COMPLETED'
    const isOnHold = sub.status === 'ON_HOLD'

    const href = isSublet
        ? `/projects/${sub.projectId}/sub/${sub.id}`
        : `/projects/${sub.projectId}/sub/${sub.id}`

    return (
        <Link
            href={href}
            className="glass-card group flex flex-col h-full relative overflow-hidden"
        >
            {/* Visual Accent */}
            <div className={cn(
                "absolute top-0 right-0 w-28 h-28 blur-3xl rounded-full -mr-12 -mt-12 opacity-10 transition-opacity group-hover:opacity-30",
                isCompleted ? "bg-success" : isOnHold ? "bg-warning" : "bg-primary"
            )} />

            <div className="relative z-10 flex flex-col h-full space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm",
                        isCompleted ? "bg-success/10 text-success" :
                            isOnHold ? "bg-warning/10 text-warning" :
                                "bg-primary text-white shadow-ruby-soft group-hover:rotate-[10deg]"
                    )}>
                        {isSublet ? <GitBranch size={18} /> : <FolderOpen size={18} />}
                    </div>

                    <div className={cn(
                        "badge border-none py-1.5 px-3 text-sm font-black uppercase tracking-wider",
                        isCompleted ? "bg-success/10 text-success" :
                            isOnHold ? "bg-warning/10 text-warning" :
                                "bg-primary/10 text-primary"
                    )}>
                        <span className="animate-pulse-slow mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                        {sub.status.replace('_', ' ')}
                    </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5 flex-1">
                    <h3 className="text-base font-bold text-base-content/90 group-hover:text-primary transition-colors leading-tight">
                        {sub.title}
                    </h3>
                    <p className="text-[12px] text-base-content/70 font-medium leading-relaxed line-clamp-2">
                        {sub.description || (isSublet ? "Operational unit." : "Strategic phase scope.")}
                    </p>
                </div>

                {/* Stats Footer */}
                <div className="flex items-center justify-between pt-4 mt-auto border-t border-base-content/20">
                    <div className="flex items-center gap-4 text-sm font-bold text-base-content/30 uppercase tracking-tighter">
                        <div className="flex items-center gap-1.5">
                            <Layers size={13} className="text-primary/40" />
                            <span>{taskCount} Tasks</span>
                        </div>
                        {!isSublet && (
                            <div className="flex items-center gap-1.5">
                                <GitBranch size={13} className="text-warning/40" />
                                <span>{childCount} Units</span>
                            </div>
                        )}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-base-content/5 flex items-center justify-center text-base-content/70 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-1">
                        <ArrowUpRight size={14} />
                    </div>
                </div>
            </div>
        </Link>
    )
}
