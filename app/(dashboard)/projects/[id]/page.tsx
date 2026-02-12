
import React from 'react'
import { auth } from '@/auth'
import prisma from '@/lib/db'
import { notFound } from 'next/navigation'
import { 
  Plus, 
  Users, 
  ClipboardList, 
  Settings, 
  Calendar,
  MessageSquare,
  Clock,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import TaskChat from '@/components/TaskChat'
import InviteMember from '@/components/InviteMember'
import { cn } from '@/lib/utils'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return null
  
  const projectId = parseInt(params.id)
  if (isNaN(projectId)) notFound()

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        include: {
          assignee: true,
          sla: true
        },
        orderBy: { createdAt: 'desc' }
      },
      messages: {
        include: {
          author: true
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!project) notFound()

  const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length
  const progress = project.tasks.length > 0 
    ? Math.round((completedTasks / project.tasks.length) * 100) 
    : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col gap-4">
        <Link href="/projects" className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest hover:translate-x-[-4px] transition-transform w-fit">
          <ArrowLeft className="w-3 h-3" /> Back to Fleet
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-base-content tracking-tighter uppercase">{project.title}</h1>
            <p className="text-base-content/60 max-w-2xl font-medium">{project.description || "Project operational shell active."}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/tasks/new?projectId=${projectId}`} className="btn btn-primary btn-sm gap-2">
              <Plus className="w-4 h-4" /> Add Task
            </Link>
            <InviteMember projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Progress & Tasks */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Progress Bar (Minimized) */}
          <div className="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
             <div className="p-4 flex items-center gap-4 bg-base-200/30">
                <div className="shrink-0">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-black uppercase text-[10px] tracking-widest">Global Progress</h3>
                    <span className="text-[10px] font-black text-primary">{progress}%</span>
                  </div>
                  <div className="w-full bg-base-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-500" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
             </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content/40">Active Directives</h2>
               <div className="badge badge-outline font-black text-[10px] uppercase">{project.tasks.length} Total</div>
            </div>
            
            <div className="grid gap-3">
               {project.tasks.length === 0 ? (
                 <div className="p-12 border-2 border-dashed border-base-200 rounded-2xl flex flex-col items-center justify-center opacity-40">
                    <ClipboardList className="w-8 h-8 mb-2" />
                    <span className="text-xs font-bold">No tasks assigned to this project yet.</span>
                 </div>
               ) : (
                 project.tasks.map(task => (
                   <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center justify-between p-4 bg-base-100 border border-base-200 rounded-xl hover:border-primary/40 transition-all group shadow-sm">
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-2 h-10 rounded-full",
                           task.status === 'COMPLETED' ? "bg-success" : task.status === 'IN_PROGRESS' ? "bg-primary" : "bg-base-300"
                         )} />
                         <div>
                            <h4 className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{task.title}</h4>
                            <div className="flex items-center gap-3 mt-1 opacity-60">
                               <span className="text-[10px] font-black uppercase">{task.assignee?.name || 'Unassigned'}</span>
                               <span className="text-[10px] font-bold px-2 py-0.5 bg-base-200 rounded-full">{task.sla.name}</span>
                            </div>
                         </div>
                      </div>
                      <button className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black tracking-widest">Details</button>
                   </Link>
                 ))
               )}
            </div>
          </div>
        </div>

        {/* Right Column: Feed/Chat */}
        <div className="lg:col-span-1 space-y-4">
           <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content/40">Project Feed</h2>
           <TaskChat 
             taskId={undefined} 
             projectId={projectId} 
             initialMessages={project.messages as any} 
             currentUserId={parseInt(session?.user?.id || "0")} 
           />
        </div>

      </div>
    </div>
  )
}
