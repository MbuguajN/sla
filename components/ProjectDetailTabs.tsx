'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { FolderOpen } from 'lucide-react'
import SubProjectCard from './SubProjectCard'
import NewSubProjectClient from './NewSubProjectClient'

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

export default function ProjectDetailTabs({
    projectId,
    subProjects,
    canCreateSub
}: {
    projectId: number
    subProjects: SubProjectData[]
    canCreateSub: boolean
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider bg-white dark:bg-slate-900 text-primary shadow-sm w-fit">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Phases
                    <span className="ml-1 px-1.5 py-0.5 rounded-md text-xs bg-primary/10 text-primary">
                        {subProjects.length}
                    </span>
                </div>
            </div>

            <div className="space-y-6">
                {canCreateSub && (
                    <NewSubProjectClient projectId={projectId} />
                )}

                {subProjects.length === 0 ? (
                    <div className="p-16 border-2 border-dashed border-base-200 rounded-3xl flex flex-col items-center justify-center opacity-40 text-center">
                        <FolderOpen className="w-10 h-10 mb-3" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">No Sub-Projects Yet</h4>
                        <p className="text-xs font-normal mt-1 max-w-[240px]">
                            {canCreateSub ? 'Create the first sub-project to organize work and host tasks.' : 'No sub-projects have been created for this project.'}
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
        </div>
    )
}
