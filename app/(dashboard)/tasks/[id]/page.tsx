import React from 'react'
import prisma from '@/lib/db'
import TaskChat from '@/components/TaskChat'
import StatusControlBar from '@/components/StatusControlBar'
import { TaskStatus } from '@/lib/enums'
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
      <Link href="/" className="btn btn-primary">Return Home</Link>
    </div>
  )

  const isCompleted = task.status === 'COMPLETED'

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-32 px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 pt-4">
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <Link href="/" className="text-[10px] font-black text-primary flex items-center gap-2 hover:underline mb-1 group w-fit uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" /> Back to Operational Timeline
          </Link>
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 bg-primary text-primary-content rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-base-content uppercase leading-[1.1] break-words">
                {task.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-base-content/30 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2"><History className="w-3.5 h-3.5" /> Initialized {format(task.createdAt, 'PP')}</span>
                {task.dueAt && (
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-base-200 rounded-lg text-primary/80 border border-primary/5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Goal: {format(task.dueAt, 'PPp')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:items-end gap-6 shrink-0">
          <div className="flex items-center gap-4 bg-base-200/50 p-4 rounded-3xl border border-base-300/50">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40">SLA Performance</span>
            {task.dueAt && (
              <div className="scale-110 origin-right">
                <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <PauseTask taskId={task.id} />
            <StatusControlBar
              taskId={task.id}
              currentStatus={task.status as TaskStatus}
              assigneeId={task.assigneeId}
              reporterId={task.reporterId}
              currentUserId={Number((session?.user as any)?.id)}
              userRole={(session?.user as any)?.role as string}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Details */}
        <div className="lg:col-span-8 space-y-10">
          {/* Description */}
          <div className="card bg-base-100 border border-base-200 shadow-sm rounded-[1.5rem] overflow-hidden">
            <div className="card-body p-8 lg:p-10 gap-6">
              <div className="flex items-center gap-2.5 text-primary">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="card-title text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Operational Briefing</h2>
              </div>
              <div className="bg-base-200/20 p-8 rounded-[1rem] border border-base-200/50 text-base lg:text-lg font-medium text-base-content/80 leading-relaxed italic">
                {task.description || <span className="opacity-20 italic">No tactical briefing provided for this directive.</span>}
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
                      <div className="bg-primary text-primary-content rounded-full w-10 h-10 grid place-items-center overflow-hidden border border-white/10 shadow-inner">
                        <span className="text-lg font-black leading-none">{task.assignee?.name?.charAt(0) || '?'}</span>
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
                          <div className="bg-base-300 text-base-content rounded-full w-8 h-8 flex items-center justify-center overflow-hidden border border-base-100 shadow-sm">
                            <span className="text-xs font-black flex items-center justify-center">{w.user.name?.charAt(0)}</span>
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
