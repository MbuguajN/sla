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
    <div className="space-y-8 max-w-6xl mx-auto pb-32 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-6 pb-4 border-b border-base-200/50">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <Link href="/" className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group w-fit uppercase tracking-wider">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
          </Link>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-primary text-primary-content rounded-xl flex items-center justify-center shadow-md shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0 max-w-3xl">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-base-content leading-snug break-words mb-0">
                {task.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-base-content/50">
                  <History className="w-3.5 h-3.5" />
                  Created {format(task.createdAt, 'PP')}
                </span>
                {task.dueAt && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg text-primary">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-bold text-[11px]">Due: {format(task.dueAt, 'PPp')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:items-end gap-3 shrink-0 lg:ml-auto">
          <div className="flex items-center gap-3 bg-base-content/[0.03] px-4 py-3 rounded-xl border border-base-content/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">SLA</span>
            {task.dueAt && (
              <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Status Bar */}
          <div className="bg-base-100 p-2 rounded-xl border border-base-content/5 shadow-sm">
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
          <div className="card bg-base-100 border border-base-content/5 shadow-sm rounded-2xl overflow-hidden">
            <div className="card-body p-6 gap-4">
              <div className="flex items-center gap-3 text-primary">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider opacity-80 mb-0">Brief Details</h2>
              </div>
              <div className="bg-base-content/[0.02] p-5 rounded-xl border border-base-content/5 text-sm text-base-content leading-relaxed">
                {task.description || <span className="opacity-30 italic">No details provided.</span>}
              </div>
            </div>
          </div>

          {/* Activity & Messages */}
          <div className="card bg-base-100 border border-base-content/5 shadow-sm overflow-hidden rounded-2xl">
            <div className="bg-base-content/[0.02] px-6 py-4 border-b border-base-content/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="w-4 h-4" />
                <h2 className="text-sm font-bold uppercase tracking-wider leading-none mb-0">Activity Log</h2>
              </div>
              <span className="badge badge-sm font-bold bg-base-content/5 text-base-content/50 border-none">{task.messages.length} Messages</span>
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

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card bg-base-100 border border-base-content/5 shadow-sm overflow-hidden sticky top-12 rounded-2xl">
            <div className="card-body p-0">
              {/* Assigned To */}
              <div className="p-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/30 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" /> Assigned To
                </span>
                <div className="flex items-center gap-3 bg-base-content/[0.02] p-3 rounded-xl border border-base-content/5">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-lg w-10 h-10 flex items-center justify-center shadow-sm">
                      <span className="text-base font-bold">{task.assignee?.name?.charAt(0) || '?'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-base-content truncate">{task.assignee?.name || 'Unassigned'}</span>
                    <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider leading-none mt-0.5">Handler</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-base-content/5 mx-5" />

              {/* SLA */}
              <div className="p-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/30 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> SLA
                </span>
                <div className="flex flex-col gap-3 bg-base-content/[0.02] p-4 rounded-xl border border-base-content/5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-base-content uppercase tracking-tight">{task.sla?.name}</span>
                    <span className="text-[10px] text-base-content/30 uppercase tracking-wider">Service Level Agreement</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="badge badge-sm bg-primary text-primary-content border-none font-bold text-[10px] uppercase tracking-wider h-6 px-3">
                      {task.sla?.durationHrs}H
                    </div>
                    <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider">Time Limit</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-base-content/5 mx-5" />

              {/* Watchers */}
              <div className="p-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-base-content/30 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" /> Watchers ({task.watchers.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {task.watchers.map((w: any) => (
                    <div key={w.id} className="tooltip" data-tip={w.user.name}>
                      <div className="avatar placeholder hover:scale-110 transition-transform">
                        <div className="bg-base-content/5 text-base-content rounded-full w-8 h-8 flex items-center justify-center border border-base-content/5 shadow-sm">
                          <span className="text-[10px] font-bold">{w.user.name?.charAt(0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {task.watchers.length === 0 && (
                    <div className="w-full p-4 border border-dashed border-base-content/10 rounded-xl flex items-center justify-center">
                      <span className="text-[11px] text-base-content/20 italic text-center">No watchers</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="mt-8">
        <TaskActivity logs={task.auditLogs as any} />
      </div>
    </div>
  )
}
