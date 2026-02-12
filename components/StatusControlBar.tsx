'use client'

import React, { useOptimistic, useTransition } from 'react'
import { TaskStatus } from '@prisma/client'
import { advanceTaskStatus } from '@/app/actions/taskActions'
import { CheckCircle, Play, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusConfig = {
  label: string
  icon: React.ElementType
  color: string
  next: TaskStatus | null
}

const STATUS_MAP: Record<TaskStatus, StatusConfig> = {
  [TaskStatus.PENDING]: {
    label: 'Confirm Receipt',
    icon: CheckCircle,
    color: 'btn-primary',
    next: TaskStatus.RECEIVED
  },
  [TaskStatus.RECEIVED]: {
    label: 'Start Work',
    icon: Play,
    color: 'btn-info',
    next: TaskStatus.IN_PROGRESS
  },
  [TaskStatus.IN_PROGRESS]: {
    label: 'Submit for Review',
    icon: Send,
    color: 'btn-warning',
    next: TaskStatus.REVIEW
  },
  [TaskStatus.REVIEW]: {
    label: 'Complete Task',
    icon: CheckCircle2,
    color: 'btn-success',
    next: TaskStatus.COMPLETED
  },
  [TaskStatus.COMPLETED]: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'btn-disabled',
    next: null
  },
  [TaskStatus.AWAITING_INFO]: {
    label: 'Resume Work',
    icon: Play,
    color: 'btn-info',
    next: TaskStatus.IN_PROGRESS
  }
}

export default function StatusControlBar({ 
  taskId, 
  currentStatus,
  assigneeId,
  currentUserId,
  userRole
}: { 
  taskId: number, 
  currentStatus: TaskStatus,
  assigneeId?: number | null,
  currentUserId: number,
  userRole: string
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    currentStatus,
    (state, newStatus: TaskStatus) => newStatus
  )

  const config = STATUS_MAP[optimisticStatus]
  const isCompleted = optimisticStatus === TaskStatus.COMPLETED

  async function handleAdvance() {
    if (!config.next || isPending) return

    startTransition(async () => {
      setOptimisticStatus(config.next!)
      try {
        await advanceTaskStatus(taskId, config.next!)
      } catch (err) {
        console.error(err)
        // In a real app, we'd show a toast error here
      }
    })
  }

  return (
    <div className="flex items-center gap-4 bg-base-100 p-4 rounded-2xl border border-base-300 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Current Workflow State</span>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isCompleted ? "bg-success" : "bg-primary"
          )} />
          <span className="text-sm font-bold uppercase tracking-tight">{optimisticStatus}</span>
        </div>
      </div>

      <div className="divider divider-horizontal mx-2"></div>

      {config.next ? (
        <button 
          className={cn(
            "btn btn-md flex-1 md:flex-none md:min-w-[200px] gap-3 shadow-lg transition-all active:scale-95",
            config.color,
            isPending && "loading"
          )}
          onClick={handleAdvance}
          disabled={isPending || (optimisticStatus === TaskStatus.PENDING && assigneeId !== currentUserId && userRole !== 'ADMIN')}
        >
          {isPending ? null : <config.icon className="w-5 h-5" />}
          {isPending ? 'Propagating...' : config.label}
        </button>
      ) : (
        <div className="flex items-center gap-3 text-success font-black uppercase text-sm px-6 py-3 bg-success/10 rounded-xl border border-success/20">
          <CheckCircle2 className="w-5 h-5" />
          Task Finalized
        </div>
      )}

      {isPending && (
        <div className="hidden md:flex items-center gap-2 text-primary font-bold animate-pulse text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          Syncing with engine...
        </div>
      )}
    </div>
  )
}
