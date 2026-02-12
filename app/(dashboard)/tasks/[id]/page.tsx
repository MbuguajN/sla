import React from 'react'
import prisma from '@/lib/db'
import TaskChat from '@/components/TaskChat'
import StatusControlBar from '@/components/StatusControlBar'
import SLACountdown from '@/components/SLACountdown'
import TaskActivity from '@/components/TaskActivity'
import PauseTask from '@/components/PauseTask'
import { auth } from '@/auth'
import { format } from 'date-fns'
import { 
  Calendar, 
  Clock, 
  User, 
  Users, 
  FileText, 
  MessageSquare, 
  History,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

type Props = {
  params: { id: string }
}

export default async function TaskPage({ params }: Props) {
  const session = await auth()
  const id = Number(params.id)
  const task = await prisma.task.findUnique({
    where: { id },
    include: { 
      sla: true, 
      messages: { orderBy: { createdAt: 'asc' }, include: { author: true } }, 
      assignee: true,
      watchers: { include: { user: true } },
      auditLogs: { orderBy: { createdAt: 'desc' }, include: { user: true } }
    },
  })

  if (!task) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="text-4xl font-black opacity-20 uppercase tracking-tighter">Task Not Found</div>
      <Link href="/" className="btn btn-primary">Return to Nexus</Link>
    </div>
  )

  const isCompleted = task.status === 'COMPLETED'

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to Operational Timeline
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary text-primary-content rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-base-content uppercase leading-none">{task.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm font-medium text-base-content/50">
                <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Initialized {format(task.createdAt, 'PPp')}</span>
                {task.dueAt && (
                   <div className="flex items-center gap-2 px-2 py-0.5 bg-base-300 rounded-md text-base-content/70">
                     <span className="text-[10px] font-black uppercase tracking-widest">SLA Goal</span>
                     <span className="text-xs">{format(task.dueAt, 'PPp')}</span>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40">SLA Performance</span>
            {task.dueAt && (
              <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />
            )}
          </div>
          <div className="flex items-center gap-3">
            <PauseTask taskId={task.id} />
            <StatusControlBar 
              taskId={task.id} 
              currentStatus={task.status} 
              assigneeId={task.assigneeId}
              currentUserId={Number((session as any)?.user?.id)}
              userRole={(session as any)?.user?.role as string}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <div className="card bg-base-100 border border-base-200 shadow-sm">
            <div className="card-body p-8 gap-6">
              <div className="flex items-center gap-2 text-primary">
                <FileText className="w-5 h-5" />
                <h2 className="card-title text-sm font-black uppercase tracking-widest leading-none">Task Briefing</h2>
              </div>
              <div className="bg-base-200/50 p-6 rounded-2xl text-base-content/80 leading-relaxed font-medium">
                {task.description || <span className="italic opacity-50">No briefing provided for this task.</span>}
              </div>
            </div>
          </div>

          {/* Workflow & Messages */}
          <div className="card bg-base-100 border border-base-200 shadow-xl overflow-hidden">
            <div className="bg-base-200/50 px-8 py-4 border-b border-base-300 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="w-5 h-5" />
                <h2 className="text-sm font-black uppercase tracking-widest leading-none">Activity Log</h2>
              </div>
              <span className="badge badge-sm font-bold opacity-50">{task.messages.length} Events</span>
            </div>
            <div className="p-0">
                <TaskChat 
                  taskId={task.id} 
                  projectId={task.projectId || undefined}
                  initialMessages={task.messages.map((m: any) => ({ 
                    authorId: m.authorId, 
                    authorName: m.author?.name || 'User',
                    content: m.content, 
                    createdAt: m.createdAt?.toISOString() 
                  }))} 
                  currentUserId={Number((await auth())?.user?.id) || 1}
                />
            </div>
          </div>
        </div>

        {/* Right Column: Stakeholders */}
        <div className="space-y-6">
          <div className="card bg-base-100 border border-base-200 shadow-sm h-fit">
            <div className="card-body p-6 gap-6">
               <div className="space-y-4">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40 flex items-center gap-1.5 line-height-none">
                      <User className="w-3 h-3" /> Responsibility
                    </span>
                    <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-xl border border-base-200">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-lg w-10 h-10 flex items-center justify-center overflow-hidden">
                          <span className="text-lg font-bold flex items-center justify-center">{task.assignee?.name?.charAt(0) || '?'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold truncate">{task.assignee?.name || 'Unassigned'}</span>
                        <span className="text-[10px] uppercase font-medium text-base-content/50 truncate">Project Manager</span>
                      </div>
                    </div>
                 </div>

                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40 flex items-center gap-1.5 line-height-none">
                      <Clock className="w-3 h-3" /> SLA Parameters
                    </span>
                    <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl border border-base-200 font-bold text-sm">
                      <span className="text-base-content/60">{task.sla?.name}</span>
                      <span className="text-primary">{task.sla?.durationHrs}h Window</span>
                    </div>
                 </div>

                 <div className="flex flex-col gap-3 pt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40 flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Watchers ({task.watchers.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {task.watchers.map((w: any) => (
                        <div key={w.id} className="tooltip" data-tip={w.user.name}>
                          <div className="avatar placeholder">
                            <div className="bg-base-300 text-base-content rounded-full w-8 h-8 flex items-center justify-center overflow-hidden">
                              <span className="text-xs font-bold flex items-center justify-center">{w.user.name?.charAt(0)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {task.watchers.length === 0 && <span className="text-xs italic opacity-40">No watchers added</span>}
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Activity Timeline Section */}
      <div className="mt-8">
        <TaskActivity logs={task.auditLogs as any} />
      </div>
    </div>
  )
}
