'use client'

import React from 'react'
import Link from 'next/link'
import { Briefcase, ArrowUpRight, Layers, Clock, CheckCircle2, Search, BarChart3, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type ProjectSummary = {
  id: number
  title: string
  description: string | null
  createdAt: Date
  taskCount: number
  completedCount: number
}

export default function ProjectsGrid({ projects }: { projects: ProjectSummary[] }) {
  const [search, setSearch] = React.useState('')

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
        <div className="relative group w-full md:w-80">
          <div className="absolute inset-0 bg-primary/5 blur-xl group-focus-within:bg-primary/10 transition-colors rounded-2xl" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30 group-focus-within:text-primary transition-all group-focus-within:scale-110" />
          <input
            type="text"
            placeholder="Filter projects..."
            className="input w-full pl-12 bg-base-content/5 border-transparent focus:bg-base-100 focus:border-primary/20 focus:outline-none focus:ring-4 focus:ring-primary/5 font-medium text-[13px] h-12 rounded-2xl transition-all relative z-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center py-24 rounded-3xl border-dashed border-2 border-base-content/10">
          <div className="w-16 h-16 bg-base-content/5 rounded-2xl flex items-center justify-center text-base-content/20 mb-6">
            <Briefcase size={32} />
          </div>
          <h3 className="text-xl font-bold text-base-content/40 italic">Resource Void</h3>
          <p className="text-sm text-base-content/30 mt-2 font-medium">No projects match the current temporal filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project, idx) => {
            const progress = project.taskCount > 0
              ? Math.round((project.completedCount / project.taskCount) * 100)
              : 0
            const isAllDone = project.taskCount > 0 && project.completedCount === project.taskCount
            const pendingCount = project.taskCount - project.completedCount

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="glass-card group flex flex-col h-full relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 opacity-10 transition-opacity group-hover:opacity-30",
                  isAllDone ? "bg-success" : "bg-primary"
                )} />

                <div className="relative z-10 flex flex-col h-full space-y-5">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                      isAllDone ? "bg-success/10 text-success" : "bg-primary text-white shadow-ruby-soft group-hover:rotate-[10deg]"
                    )}>
                      <Briefcase size={20} />
                    </div>

                    <div className={cn(
                      "badge border-none py-1.5 px-3",
                      isAllDone ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                    )}>
                      <span className="animate-pulse-slow mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                      {isAllDone ? 'Delivered' : `${pendingCount} Left`}
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-bold text-base-content/90 group-hover:text-primary transition-colors leading-tight">
                      {project.title}
                    </h3>
                    <p className="text-[13px] text-base-content/50 font-medium leading-relaxed line-clamp-2">
                      {project.description || "Core operational objective with defined SLA parameters."}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-base-content/40">
                      <span>Velocity</span>
                      <span className={isAllDone ? "text-success" : "text-primary"}>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-base-content/5 rounded-full overflow-hidden p-0.5 border border-base-content/5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                          isAllDone ? "bg-success" : "bg-gradient-to-r from-primary/60 to-primary shadow-[0_0_10px_rgba(190,30,61,0.3)]"
                        )}
                        style={{ width: `${Math.max(progress, 2)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 mt-auto border-t border-base-content/5">
                    <div className="flex items-center gap-4 text-[11px] font-bold text-base-content/30 uppercase tracking-tighter">
                      <div className="flex items-center gap-1.5">
                        <Layers size={14} className="text-primary/40" />
                        <span>{project.taskCount} Units</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-success/40" />
                        <span>High Priority</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-base-content/5 flex items-center justify-center text-base-content/40 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-1">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
