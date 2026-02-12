'use client'

import Link from 'next/link'
import { Folder, ArrowRight, Layers, Clock, CheckCircle2 } from 'lucide-react'
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
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-base-300 rounded-2xl">
        <Folder className="w-12 h-12 text-base-content/20 mb-4" />
        <h3 className="text-lg font-bold opacity-50">No Active Projects</h3>
        <p className="text-sm opacity-40">Initialize a project to group directives.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => {
        const progress = project.taskCount > 0 
          ? Math.round((project.completedCount / project.taskCount) * 100) 
          : 0
        
        return (
          <Link 
            key={project.id} 
            href={`/projects/${project.id}`}
            className="card bg-base-100 shadow-sm border border-base-200 hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className="card-body p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <Folder className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full">{progress}% COMPLETE</div>
              </div>
              
              <div>
                <h3 className="text-sm font-black tracking-tight group-hover:text-primary transition-colors uppercase">
                  {project.title}
                </h3>
                <p className="text-[11px] text-base-content/50 line-clamp-2 mt-1 leading-relaxed">
                  {project.description || "Project operational shell active."}
                </p>
              </div>

              <div className="pt-3 border-t border-base-200 flex items-center justify-between text-[10px] font-black text-base-content/40 uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                   <Layers className="w-3.5 h-3.5 opacity-40" /> {project.taskCount} Directives
                </span>
                <div className="flex items-center gap-1 text-primary">
                  ACCESS <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
