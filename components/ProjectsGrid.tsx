'use client'

import React from 'react'
import Link from 'next/link'
import { Briefcase, ArrowUpRight, Layers, TrendingUp, Search, FolderOpen, GitBranch, Filter, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type ProjectSummary = {
  id: number
  title: string
  description: string | null
  status: string
  createdAt: Date
  createdBy: string | null
  taskCount: number
  completedCount: number
  subProjectCount: number
  members: any[]
}

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'COMPLETED', 'ON_HOLD'] as const

export default function ProjectsGrid({ projects }: { projects: ProjectSummary[] }) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const counts = {
    ALL: projects.length,
    ACTIVE: projects.filter(p => p.status === 'ACTIVE').length,
    COMPLETED: projects.filter(p => p.status === 'COMPLETED').length,
    ON_HOLD: projects.filter(p => p.status === 'ON_HOLD').length,
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-base-200/50 rounded-xl w-fit">
          {STATUS_OPTIONS.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                statusFilter === status
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-base-content/70 hover:text-base-content/80"
              )}
            >
              {status === 'ALL' ? 'All' : status.replace('_', ' ')}
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-xs",
                statusFilter === status ? "bg-primary/10 text-primary" : "bg-base-300 text-base-content/70"
              )}>
                {counts[status as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative group w-full md:w-72">
          <div className="absolute inset-0 bg-primary/5 blur-xl group-focus-within:bg-primary/10 transition-colors rounded-2xl" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30 group-focus-within:text-primary transition-all group-focus-within:scale-110" />
          <input
            type="text"
            placeholder="Filter projects..."
            className="input w-full pl-12 bg-base-content/5 border-transparent focus:bg-base-100 focus:border-primary/20 focus:outline-none focus:ring-4 focus:ring-primary/5 font-medium text-[13px] h-11 rounded-2xl transition-all relative z-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center py-24 rounded-3xl border-dashed border-2 border-base-content/10">
          <div className="w-16 h-16 bg-base-content/5 rounded-2xl flex items-center justify-center text-base-content/70 mb-6">
            <Briefcase size={32} />
          </div>
          <h3 className="text-xl font-bold text-base-content/70 italic">No Projects Found</h3>
          <p className="text-sm text-base-content/30 mt-2 font-medium">No projects match the current filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => {
            const progress = project.taskCount > 0
              ? Math.round((project.completedCount / project.taskCount) * 100)
              : 0
            const isAllDone = project.taskCount > 0 && project.completedCount === project.taskCount
            const isOnHold = project.status === 'ON_HOLD'
            const pendingCount = project.taskCount - project.completedCount

            return (
              <div
                key={project.id}
                className="glass-card group flex flex-col h-full relative overflow-hidden p-0"
              >
                {/* Visual Accent */}
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 opacity-10 transition-opacity group-hover:opacity-30",
                  isAllDone ? "bg-success" : isOnHold ? "bg-warning" : "bg-primary"
                )} />

                <div className="relative z-10 flex flex-col h-full space-y-4 p-6">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                      isAllDone ? "bg-success/10 text-success" :
                        isOnHold ? "bg-warning/10 text-warning" :
                          "bg-primary text-white shadow-ruby-soft group-hover:rotate-[10deg]"
                    )}>
                      <Briefcase size={18} />
                    </div>

                    <div className={cn(
                      "badge border-none py-1.5 px-3 text-sm font-black uppercase tracking-wider",
                      isAllDone ? "bg-success/10 text-success" :
                        isOnHold ? "bg-warning/10 text-warning" :
                          "bg-primary/10 text-primary"
                    )}>
                      <span className="animate-pulse-slow mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                      {isAllDone ? 'Delivered' : isOnHold ? 'On Hold' : `${pendingCount} Left`}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-base font-bold text-base-content/90 group-hover:text-primary transition-colors leading-tight">
                      {project.title}
                    </h3>
                    <p className="text-[12px] text-base-content/70 font-medium leading-relaxed line-clamp-2">
                      {project.description || "Core operational objective with defined SLA parameters."}
                    </p>
                    {project.createdBy && (
                      <p className="text-sm text-base-content/30 font-bold mt-1">
                        by {project.createdBy}
                      </p>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2 pt-3">
                    <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-base-content/70">
                      <span>Progress</span>
                      <span className={isAllDone ? "text-success" : "text-primary"}>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-base-content/5 rounded-full overflow-hidden border border-base-content/20">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                          isAllDone ? "bg-success" : "bg-gradient-to-r from-primary/60 to-primary"
                        )}
                        style={{ width: `${Math.max(progress, 2)}%` }}
                      />
                    </div>
                  </div>

                  {/* Members */}
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center">
                      <div className="flex -space-x-2 overflow-hidden items-center">
                        {(project as any).members?.slice(0, 4).map((m: any, idx: number) => (
                          <div key={idx} className="inline-block h-6 w-6 rounded-lg ring-2 ring-base-100 bg-base-200 text-sm font-black flex items-center justify-center text-base-content/70 uppercase" title={m.user?.name}>
                            {m.user?.name?.charAt(0) || '?'}
                          </div>
                        ))}
                        {(project as any).members?.length > 4 && (
                          <div className="flex items-center justify-center h-6 w-6 rounded-lg ring-2 ring-base-100 bg-base-300 text-sm font-black text-base-content/70">
                            +{(project as any).members.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Footer */}
                  <div className="flex items-center justify-between pt-4 mt-auto border-t border-base-content/20">
                    <div className="flex items-center gap-3 text-sm font-bold text-base-content/30 uppercase tracking-tighter">
                      <div className="flex items-center gap-1">
                        <Layers size={12} className="text-primary/40" />
                        <span>{project.taskCount} Tasks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderOpen size={12} className="text-warning/40" />
                        <span>{project.subProjectCount} Subs</span>
                      </div>
                    </div>
                    <Link
                      href={`/projects/${project.id}`}
                      className="w-7 h-7 rounded-lg bg-base-content/5 flex items-center justify-center text-base-content/70 hover:bg-primary hover:text-white transition-all transform hover:translate-x-1"
                    >
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
