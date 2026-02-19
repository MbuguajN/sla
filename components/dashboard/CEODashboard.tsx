'use client'

import React, { useState, useMemo } from 'react'
import {
    Search,
    LayoutGrid,
    List,
    AlertCircle,
    CheckCircle2,
    Clock,
    TrendingUp,
    FolderDot,
    UserCheck,
    ShieldCheck,
    Zap,
    Activity,
    ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskStatus } from '@/lib/enums'
import Link from 'next/link'
import { format } from 'date-fns'
import SLACountdown from '@/components/SLACountdown'

interface Project {
    id: number
    title: string
    description: string | null
    tasks: { status: string, dueAt: Date | null }[]
}

interface Task {
    id: number
    title: string
    status: TaskStatus
    dueAt: Date | null
    project: { id: number, title: string } | null
    assignee: { name: string | null } | null
    sla: { name: string, tier: string }
}

interface CEODashboardProps {
    projects: Project[]
    allActiveTasks: Task[]
    activeUsers: any[]
    overdueCount: number
    activeCount: number
}

export default function CEODashboard({
    projects,
    allActiveTasks,
    activeUsers,
    overdueCount,
    activeCount
}: CEODashboardProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    const filteredProjects = useMemo(() => {
        return projects.filter(p =>
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [projects, searchTerm])

    const filteredTasks = useMemo(() => {
        return allActiveTasks.filter(t =>
            t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.project?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.assignee?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [allActiveTasks, searchTerm])

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Executive Header Layer */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-base-300 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[10px] opacity-70">
                        <ShieldCheck className="w-3 h-3" />
                        Executive Command Suite
                    </div>
                    <h1 className="text-5xl font-black text-base-content tracking-tighter leading-none">
                        Strategic Overview
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search Strategic Intelligence..."
                            className="input input-bordered bg-base-200/30 border-base-300 focus:border-primary focus:bg-base-100 w-full md:w-[320px] pl-11 font-bold text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center bg-base-200 border border-base-300 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-base-100 shadow-sm text-primary" : "text-base-content/40 hover:text-base-content")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-base-100 shadow-sm text-primary" : "text-base-content/40 hover:text-base-content")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Command Bar - Sleener & more official */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'System Health', value: '98.2%', sub: 'Global Uptime', icon: Activity, color: 'text-success' },
                    { label: 'Active Directives', value: activeCount, sub: 'In Flight', icon: Zap, color: 'text-primary' },
                    { label: 'Critical Breaches', value: overdueCount, sub: 'Urgent Action', icon: AlertCircle, color: overdueCount > 0 ? 'text-error' : 'text-base-content/20' },
                    { label: 'Resources Online', value: activeUsers.length, sub: 'Active Sessions', icon: UserCheck, color: 'text-info' }
                ].map((kpi, i) => (
                    <div key={i} className="bg-base-100 border border-base-300 p-5 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all duration-300 shadow-sm">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40 block">
                                {kpi.label}
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className={cn("text-2xl font-black tracking-tighter", kpi.color)}>
                                    {kpi.value}
                                </span>
                                <span className="text-[9px] font-bold text-base-content/30 lowercase italic">
                                    {kpi.sub}
                                </span>
                            </div>
                        </div>
                        <div className={cn("p-3 rounded-xl bg-base-200 group-hover:bg-primary/5 transition-colors", kpi.color)}>
                            <kpi.icon className="w-5 h-5 opacity-70" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Projects Health Grid */}
                <div className="xl:col-span-12 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-primary rounded-full" />
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content/60">Operational Portfolio</h2>
                        </div>
                        <Link href="/projects" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
                            Full Inventory <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                            {filteredProjects.map(project => {
                                const total = project.tasks.length
                                const completed = project.tasks.filter(t => t.status === TaskStatus.COMPLETED).length
                                const overdue = project.tasks.filter(t => t.status !== TaskStatus.COMPLETED && t.dueAt && new Date(t.dueAt) < new Date()).length
                                const progress = total > 0 ? (completed / total) * 100 : 0

                                return (
                                    <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className="bg-base-100 border border-base-300 p-5 rounded-2xl hover:border-primary/40 hover:shadow-lg transition-all duration-300 group flex flex-col h-full relative overflow-hidden"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-2.5 bg-base-200 rounded-xl group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                                <FolderDot className="w-4 h-4" />
                                            </div>
                                            <div className={cn(
                                                "text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase",
                                                overdue > 0 ? "bg-error/10 text-error" : "bg-success/10 text-success"
                                            )}>
                                                {overdue > 0 ? 'Action Required' : 'Strategic'}
                                            </div>
                                        </div>

                                        <h3 className="font-black text-sm text-base-content truncate group-hover:text-primary transition-colors mb-1">
                                            {project.title}
                                        </h3>
                                        <p className="text-[10px] text-base-content/40 font-bold uppercase tracking-widest mb-4">
                                            #{project.id} • {total} Directives
                                        </p>

                                        <div className="mt-auto space-y-3">
                                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                                                <span className="text-base-content/40">Efficiency</span>
                                                <span className="text-primary">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="h-1 bg-base-200 rounded-full overflow-hidden shadow-inner flex">
                                                <div
                                                    className="bg-primary h-full transition-all duration-1000"
                                                    style={{ width: `${progress}%` }}
                                                />
                                                {overdue > 0 && (
                                                    <div
                                                        className="bg-error h-full opacity-50 transition-all duration-1000"
                                                        style={{ width: `${(overdue / total) * 100}%` }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm">
                            <table className="table w-full">
                                <thead className="bg-base-200/50 text-[9px] font-black uppercase tracking-widest text-base-content/40 border-b border-base-300">
                                    <tr>
                                        <th className="pl-6 h-12">Portfolio Item</th>
                                        <th>Health Metrics</th>
                                        <th>Allocation</th>
                                        <th className="text-right pr-6">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-base-300">
                                    {filteredProjects.map(project => {
                                        const total = project.tasks.length
                                        const completed = project.tasks.filter(t => t.status === TaskStatus.COMPLETED).length
                                        const progress = total > 0 ? (completed / total) * 100 : 0

                                        return (
                                            <tr key={project.id} className="hover:bg-base-200/20 group transition-all h-16">
                                                <td className="pl-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-sm group-hover:text-primary transition-colors">{project.title}</span>
                                                        <span className="text-[9px] font-bold text-base-content/30 uppercase">ID-{project.id}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 bg-base-200 h-1.5 rounded-full overflow-hidden">
                                                            <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-primary">{Math.round(progress)}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="text-[10px] font-black text-base-content/60 uppercase tracking-widest">{total} Active</span>
                                                </td>
                                                <td className="text-right pr-6">
                                                    <Link href={`/projects/${project.id}`} className="btn btn-ghost btn-xs text-primary font-black uppercase tracking-widest h-8 min-h-8">
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Global Operational Registry - Integrated and cleaned */}
                <div className="xl:col-span-12 space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content/60">Operational Directives</h2>
                    </div>

                    <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-base-200/50 text-[9px] font-black uppercase tracking-widest text-base-content/40 border-b border-base-300">
                                    <tr>
                                        <th className="pl-8 h-12">Directive Description</th>
                                        <th>Origin Cluster</th>
                                        <th>Operator</th>
                                        <th>SLA Timeline</th>
                                        <th className="text-right pr-8">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-base-300">
                                    {filteredTasks.slice(0, 12).map(task => {
                                        const isBreached = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== TaskStatus.COMPLETED

                                        return (
                                            <tr key={task.id} className="hover:bg-base-200/20 group transition-all h-20">
                                                <td className="pl-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-1 h-8 rounded-full transition-all group-hover:h-10",
                                                            isBreached ? "bg-error" : "bg-base-300"
                                                        )} />
                                                        <div className="flex flex-col max-w-[300px]">
                                                            <Link href={`/tasks/${task.id}`} className="font-bold text-xs text-base-content hover:text-primary transition-colors truncate">
                                                                {task.title}
                                                            </Link>
                                                            <span className="text-[9px] font-bold text-base-content/30 uppercase">SIG-{task.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {task.project ? (
                                                        <Link href={`/projects/${task.project.id}`} className="text-[10px] font-black uppercase tracking-widest text-base-content/50 hover:text-primary transition-colors">
                                                            {task.project.title}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-[9px] opacity-20">—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {task.assignee?.name ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-lg bg-base-200 text-base-content/60 font-black text-[9px] flex items-center justify-center">
                                                                {task.assignee.name.charAt(0)}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-base-content/60 uppercase">{task.assignee.name.split(' ')[0]}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] opacity-20 uppercase tracking-widest">Awaiting</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {task.dueAt && (
                                                        <div className="flex flex-col">
                                                            <SLACountdown dueDate={task.dueAt} isCompleted={task.status === TaskStatus.COMPLETED} />
                                                            <span className="text-[8px] font-black uppercase tracking-[0.1em] text-base-content/30 mt-0.5">
                                                                {format(new Date(task.dueAt), 'MMM d, HH:mm')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-right pr-8">
                                                    <div className={cn(
                                                        "badge font-black text-[8px] uppercase tracking-widest h-6 px-3 border-none shadow-sm",
                                                        task.status === TaskStatus.COMPLETED ? "bg-success text-success-content" :
                                                            task.status === TaskStatus.REVIEW ? "bg-warning text-warning-content" :
                                                                task.status === TaskStatus.IN_PROGRESS ? "bg-primary text-primary-content" :
                                                                    "bg-base-300 text-base-content/60"
                                                    )}>
                                                        {task.status.replace('_', ' ')}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Link href="/tasks" className="block p-4 bg-base-200/30 text-center text-[9px] font-black uppercase tracking-[0.3em] text-primary hover:bg-base-200 transition-all border-t border-base-300">
                            Access Operational Intelligence Registry
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
