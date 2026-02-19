'use client'
import React from 'react'

import Link from 'next/link'
import { Folder, ArrowRight, Layers, Clock, CheckCircle2, Search } from 'lucide-react'
import { format } from 'date-fns'

/* 
  Ideally this data comes from a server component or server action. 
  For strict architectural compliance, we'll fetch this data properly.
*/

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
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="SEARCH PROJECTS..."
          className="input input-bordered w-full pl-12 bg-base-100 border-base-300 focus:border-primary font-bold text-xs tracking-wider h-12 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-base-300 rounded-2xl bg-base-100/50">
          <Folder className="w-12 h-12 text-base-content/20 mb-4" />
          <h3 className="text-lg font-bold opacity-50 uppercase tracking-tighter">No Matches Found</h3>
          <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">Adjust your search parameters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card bg-base-100 shadow-sm border border-base-200 hover:border-primary/40 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden rounded-[2rem]"
              >
                <div className="card-body p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/10 shadow-inner group-hover:bg-primary group-hover:text-primary-content transition-colors">
                      <Folder className="w-6 h-6" />
                    </div>
                    {project.taskCount > 0 && project.completedCount === project.taskCount ? (
                      <div className="badge bg-success/10 text-success border-success/20 gap-1.5 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ALL COMPLETED
                      </div>
                    ) : (
                      <div className="badge bg-warning/10 text-warning border-warning/20 gap-1.5 py-2">
                        <Clock className="w-3.5 h-3.5" />
                        {project.taskCount - project.completedCount} PENDING
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors uppercase leading-tight">
                      {project.title}
                    </h3>
                    <p className="text-[11px] font-bold text-base-content/40 line-clamp-2 leading-relaxed uppercase tracking-tight">
                      {project.description || "Project operational shell active."}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-base-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-base-200/50 rounded-xl text-[10px] font-black text-base-content/60 uppercase tracking-widest">
                      <Layers className="w-4 h-4 opacity-40 text-primary" /> {project.taskCount} Units
                    </div>
                    <div className="flex items-center gap-1 text-primary text-[10px] font-black uppercase tracking-widest group-hover:gap-3 transition-all">
                      ACCESS ASSETS <ArrowRight className="w-4 h-4" />
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
