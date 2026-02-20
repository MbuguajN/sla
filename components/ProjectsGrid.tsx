'use client'
import React from 'react'

import Link from 'next/link'
import { Briefcase, ArrowUpRight, Layers, Clock, CheckCircle2, Search, BarChart3 } from 'lucide-react'
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
    <div className="space-y-6">
      <div className="relative group max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search projects..."
          className="input w-full pl-10 bg-base-100 border border-base-300 focus:border-primary focus:outline-none font-normal text-sm h-10 rounded-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-base-300 rounded-xl bg-base-100">
          <Briefcase className="w-10 h-10 text-base-content/15 mb-3" />
          <h3 className="text-sm font-bold opacity-40">No projects found</h3>
          <p className="text-xs font-normal opacity-30 mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const progress = project.taskCount > 0
              ? Math.round((project.completedCount / project.taskCount) * 100)
              : 0
            const isAllDone = project.taskCount > 0 && project.completedCount === project.taskCount
            const pendingCount = project.taskCount - project.completedCount

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block bg-base-100 border border-base-300 rounded-xl hover:border-primary/40 hover:shadow-lg transition-all duration-200"
              >
                <div className="p-5 space-y-4">
                  {/* Top row: icon + status */}
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 bg-primary/8 text-primary rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md",
                      isAllDone
                        ? "bg-success/10 text-success"
                        : "bg-base-200 text-base-content/50"
                    )}>
                      {isAllDone ? (
                        <><CheckCircle2 className="w-3 h-3" /> Complete</>
                      ) : (
                        <><Clock className="w-3 h-3" /> {pendingCount} pending</>
                      )}
                    </span>
                  </div>

                  {/* Title + description */}
                  <div>
                    <h3 className="text-[15px] font-semibold text-base-content leading-snug group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-xs text-base-content/50 mt-1 line-clamp-2 leading-relaxed">
                      {project.description || "No description provided."}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-base-content/40 font-medium">Progress</span>
                      <span className="font-semibold text-base-content/60">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-base-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isAllDone ? "bg-success" : progress > 0 ? "bg-primary" : "bg-base-300"
                        )}
                        style={{ width: `${Math.max(progress, 2)}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-base-200">
                    <div className="flex items-center gap-1.5 text-[11px] text-base-content/40 font-medium">
                      <Layers className="w-3.5 h-3.5" />
                      {project.taskCount} {project.taskCount === 1 ? 'task' : 'tasks'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Open <ArrowUpRight className="w-3.5 h-3.5" />
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
