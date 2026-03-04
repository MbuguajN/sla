import React from 'react'
import { auth } from '@/auth'
import prisma from '@/lib/db'
import { notFound } from 'next/navigation'
import {
    ArrowLeft,
    FolderOpen,
    GitBranch,
    Plus,
    Clock,
    CheckCircle2,
    Layers,
    Briefcase
} from 'lucide-react'
import Link from 'next/link'
import SubProjectCard from '@/components/SubProjectCard'
import NewSubProjectClient from '@/components/NewSubProjectClient'
import ProjectTaskTabs from '@/components/ProjectTaskTabs'

export default async function SubProjectDetailPage({
    params
}: {
    params: { id: string; subId: string }
}) {
    const session = await auth()
    if (!session) return null

    const projectId = parseInt(params.id)
    const subProjectId = parseInt(params.subId)
    if (isNaN(projectId) || isNaN(subProjectId)) notFound()

    const subProject = await prisma.subProject.findUnique({
        where: { id: subProjectId },
        include: {
            project: { select: { id: true, title: true } },
            parent: { select: { id: true, title: true } },
            createdBy: { select: { id: true, name: true } },
            children: {
                include: {
                    createdBy: { select: { id: true, name: true } },
                    _count: { select: { tasks: true, children: true } }
                },
                orderBy: { createdAt: 'desc' }
            },
            tasks: {
                include: {
                    assignee: { select: { id: true, name: true } },
                    sla: true
                },
                orderBy: { createdAt: 'desc' }
            },
            _count: { select: { tasks: true, children: true } }
        }
    })

    if (!subProject || subProject.projectId !== projectId) notFound()

    const isSublet = !!subProject.parent
    const taskCount = subProject.tasks.length
    const completedCount = subProject.tasks.filter(t => t.status === 'COMPLETED').length
    const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0

    const userDept = (session.user as any)?.departmentName
    const userRole = (session.user as any)?.role
    const canCreateSub = userDept === 'CLIENT_SERVICE' || userDept === 'BUSINESS_DEVELOPMENT' || userRole === 'ADMIN'

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-12">
            {/* Breadcrumbs */}
            <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-base-content/40 flex-wrap">
                    <Link href="/projects" className="hover:text-primary transition-colors">Projects</Link>
                    <span>/</span>
                    <Link href={`/projects/${projectId}`} className="hover:text-primary transition-colors">
                        {subProject.project.title}
                    </Link>
                    {subProject.parent && (
                        <>
                            <span>/</span>
                            <Link href={`/projects/${projectId}/sub/${subProject.parent.id}`} className="hover:text-primary transition-colors">
                                {subProject.parent.title}
                            </Link>
                        </>
                    )}
                    <span>/</span>
                    <span className="text-primary">{subProject.title}</span>
                </div>

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isSublet ? 'bg-info/10 text-info border-info/20' : 'bg-warning/10 text-warning border-warning/20'
                                }`}>
                                {isSublet ? <GitBranch className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-black text-base-content tracking-tighter uppercase">{subProject.title}</h1>
                                    <span className={`badge border-none py-1.5 px-3 text-[9px] font-black uppercase tracking-wider ${subProject.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                                        subProject.status === 'ON_HOLD' ? 'bg-warning/10 text-warning' :
                                            'bg-primary/10 text-primary'
                                        }`}>
                                        {subProject.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-[10px] font-bold text-base-content/30 uppercase tracking-wider mt-1">
                                    {isSublet ? 'Sublet' : 'Sub-Project'} &middot; Created by {subProject.createdBy.name}
                                </p>
                            </div>
                        </div>
                        {subProject.description && (
                            <p className="text-base-content/60 max-w-3xl font-medium text-sm leading-relaxed italic">
                                {subProject.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {(userDept === 'CLIENT_SERVICE' || userDept === 'CLIENT SERVICE' || userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT') && (
                            <Link
                                href={`/tasks/new?projectId=${projectId}&subProjectId=${subProjectId}`}
                                className="btn btn-primary btn-md px-6 rounded-2xl gap-2 shadow-lg shadow-primary/20 uppercase font-black tracking-widest text-[10px]"
                            >
                                <Plus className="w-4 h-4" /> New Task
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Tasks</span>
                    <div className="flex items-center gap-2 text-primary">
                        <Layers className="w-4 h-4" />
                        <span className="font-black text-xl">{taskCount}</span>
                    </div>
                    <p className="text-[9px] font-bold opacity-60 uppercase">{completedCount} Completed</p>
                </div>

                <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Progress</span>
                    <div className="flex items-center gap-3">
                        <span className="font-black text-xl text-primary">{progress}%</span>
                        <div className="flex-1 bg-base-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>

                {!isSublet && (
                    <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Sublets</span>
                        <div className="flex items-center gap-2 text-info">
                            <GitBranch className="w-4 h-4" />
                            <span className="font-black text-xl">{subProject._count.children}</span>
                        </div>
                        <p className="text-[9px] font-bold opacity-60 uppercase">Nested Units</p>
                    </div>
                )}

                <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Status</span>
                    <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-black text-sm uppercase tracking-tighter">{subProject.status.replace('_', ' ')}</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-8">
                {/* Sublets Section (only for sub-projects, not sublets themselves) */}
                {!isSublet && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 flex items-center gap-2">
                                <GitBranch className="w-3.5 h-3.5" /> Sublets
                            </h2>
                        </div>

                        {canCreateSub && (
                            <NewSubProjectClient projectId={projectId} parentId={subProjectId} />
                        )}

                        {subProject.children.length === 0 ? (
                            <div className="p-10 border-2 border-dashed border-base-200 rounded-2xl flex flex-col items-center justify-center opacity-40 text-center">
                                <GitBranch className="w-8 h-8 mb-2" />
                                <h4 className="text-xs font-bold uppercase tracking-wider">No Sublets</h4>
                                <p className="text-[10px] font-normal mt-1 max-w-[200px]">Break down work further by adding sublets.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {subProject.children.map(child => (
                                    <SubProjectCard key={child.id} sub={child as any} isSublet />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tasks Section */}
                <div className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" /> Tasks
                    </h2>
                    <ProjectTaskTabs tasks={subProject.tasks as any} />
                </div>
            </div>
        </div>
    )
}
