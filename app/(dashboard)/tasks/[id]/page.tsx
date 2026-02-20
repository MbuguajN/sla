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
      <div className="text-4xl font-bold opacity-20 uppercase tracking-tight">Task Not Found</div>
      <Link href="/" className="btn btn-primary">Return Home</Link>
    </div>
  )

  const isCompleted = task.status === 'COMPLETED'

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-48 px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-8 pb-6 border-b border-base-200/50">
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <Link href="/" className="text-xs font-bold text-primary flex items-center gap-2 hover:underline mb-2 group w-fit uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Operational Timeline
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary text-primary-content rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 border border-white/10">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-2 min-w-0 max-w-3xl">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-base-content leading-snug break-words">
                {task.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-2 text-base-content/60">
                  <History className="w-4 h-4" />
                  Initialized {format(task.createdAt, 'PP')}
                </span>
                {task.dueAt && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
                    <Clock className="w-4 h-4" />
                    <span className="font-bold text-xs">GOAL: {format(task.dueAt, 'PPp')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:items-end gap-4 shrink-0 lg:ml-auto">
          <div className="flex items-center gap-4 bg-base-200/50 px-6 py-4 rounded-2xl border border-base-300/50">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/40">SLA Performance</span>
            {task.dueAt && (
              <div className="scale-110 origin-right">
                <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-8 space-y-10">
          {/* Status Bar */}
          <div className="relative z-10 bg-base-100 p-2 rounded-2xl border border-base-200 shadow-lg">
            <StatusControlBar
              taskId={task.id}
              currentStatus={task.status as TaskStatus}
              assigneeId={task.assigneeId}
              reporterId={task.reporterId}
              currentUserId={Number((session?.user as any)?.id)}
              userRole={(session?.user as any)?.role as string}
              departmentName={(session?.user as any)?.departmentName}
            />
          </div>

          {/* Description */}
          <div className="card bg-base-100 border border-base-200 shadow-sm rounded-[2rem] overflow-hidden">
            <div className="card-body p-12 lg:p-16 gap-10">
              <div className="flex items-center gap-4 text-primary">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="card-title text-sm font-bold uppercase tracking-wider opacity-80">Operational Briefing</h2>
              </div>
              <div className="bg-base-200/20 p-12 rounded-[1.5rem] border border-base-200/50 text-xl lg:text-2xl font-bold text-base-content leading-relaxed italic">
                {task.description || <span className="opacity-20 italic font-medium">No tactical briefing provided for this directive.</span>}
              </div>
            </div>
          </div>

          {/* Workflow & Messages */}
          <div className="card bg-base-100 border border-base-200 shadow-xl overflow-hidden rounded-[2rem]">
            <div className="bg-base-200/50 px-10 py-6 border-b border-base-300 flex items-center justify-between">
              <div className="flex items-center gap-3 text-primary">
                <MessageSquare className="w-6 h-6" />
                <h2 className="text-base font-bold uppercase tracking-wider leading-none">Activity Log</h2>
              </div>
              <span className="badge badge-md font-bold bg-base-300 text-base-content tracking-tighter">{task.messages.length} Events</span>
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
                currentUserId={Number((session?.user as any)?.id) || 1}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Stakeholders */}
        <div className="lg:col-span-4 space-y-8">
          <div className="card bg-base-100 border border-base-200 shadow-sm overflow-hidden sticky top-12 rounded-[2rem]">
            <div className="card-body p-0">
              {/* Responsibility Section */}
              <div className="p-8 space-y-6">
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-base-content/30 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Responsibility
                  </span>
                  <div className="flex items-center gap-5 bg-base-200/40 p-5 rounded-[1.5rem] border border-base-200/50">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-xl w-14 h-14 flex items-center justify-center shadow-xl">
                        <span className="text-2xl font-bold">{task.assignee?.name?.charAt(0) || '?'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-lg font-bold text-base-content truncate">{task.assignee?.name || 'Awaiting Resource'}</span>
                      <span className="text-xs font-bold text-base-content/40 uppercase tracking-wider leading-none mt-1">Primary Operator</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-base-200 mx-8" />

              {/* SLA Section */}
              <div className="p-8 space-y-6">
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-base-content/30 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Target Commitment
                  </span>
                  <div className="flex flex-col gap-5 bg-base-200/40 p-6 rounded-[1.5rem] border border-base-200/50">
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-bold text-base-content uppercase tracking-tight leading-tight">{task.sla?.name}</span>
                      <span className="text-xs font-normal text-base-content/30 uppercase tracking-wider">Service Level Agreement</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="badge badge-md bg-primary text-primary-content border-none font-bold text-xs uppercase tracking-wider h-8 px-4">
                        {task.sla?.durationHrs}H Window
                      </div>
                      <div className="w-1.5 h-1.5 bg-base-content/20 rounded-full" />
                      <span className="text-xs font-bold text-base-content uppercase tracking-wider">Operational Cap</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-base-300/30 mx-8" />

              {/* Watchers Section */}
              <div className="p-8 space-y-6">
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-base-content/30 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Operational Observers ({task.watchers.length})
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {task.watchers.map((w: any) => (
                      <div key={w.id} className="tooltip" data-tip={w.user.name}>
                        <div className="avatar placeholder hover:scale-110 transition-transform">
                          <div className="bg-base-300 text-base-content rounded-full w-10 h-10 flex items-center justify-center border-2 border-base-100 shadow-md">
                            <span className="text-xs font-bold">{w.user.name?.charAt(0)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {task.watchers.length === 0 && (
                      <div className="w-full p-6 border border-dashed border-base-300 rounded-[1.5rem] flex items-center justify-center">
                        <span className="text-xs font-normal text-base-content/20 italic text-center">No active observers on this node</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline Section */}
      <div className="mt-12">
        <TaskActivity logs={task.auditLogs as any} />
      </div>
    </div>
  )
}
