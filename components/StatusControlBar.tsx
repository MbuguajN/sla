'use client'

import React, { useOptimistic, useTransition } from 'react'
import { TaskStatus } from '@/lib/enums'
import { advanceTaskStatus } from '@/app/actions/taskActions'
import { CheckCircle, Play, Send, CheckCircle2, Loader2, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusConfig = {
  label: string
  icon: React.ElementType
  color: string
  next: TaskStatus | null
  secondary?: {
    label: string
    icon: React.ElementType
    color: string
    next: TaskStatus
  }
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
    next: TaskStatus.REVIEW,
    secondary: {
      label: 'Pause Directive',
      icon: XCircle,
      color: 'btn-ghost text-error',
      next: TaskStatus.AWAITING_INFO
    }
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
  },
  [TaskStatus.DISMISSED]: {
    label: 'Dismissed',
    icon: XCircle,
    color: 'btn-error',
    next: null
  }
}

export default function StatusControlBar({
  taskId,
  currentStatus,
  assigneeId,
  reporterId, // Added reporterId
  currentUserId,
  userRole
}: {
  taskId: number,
  currentStatus: TaskStatus,
  assigneeId?: number | null,
  reporterId?: number | null, // Added reporterId
  currentUserId: number,
  userRole: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    currentStatus,
    (state, newStatus: TaskStatus) => newStatus
  )

  const config = STATUS_MAP[optimisticStatus]
  const isCompleted = optimisticStatus === TaskStatus.COMPLETED

  // LOGIC: Check permissions
  const isAssignee = currentUserId === assigneeId
  const isReporter = currentUserId === reporterId
  const isAdmin = userRole === 'CEO' || userRole === 'MANAGER'

  // Only assignees can CONFIRM or START
  const canAdvanceFromPending = optimisticStatus === TaskStatus.PENDING && (isAssignee || isAdmin)
  const canAdvanceFromReceived = optimisticStatus === TaskStatus.RECEIVED && (isAssignee || isAdmin)
  const canAdvanceFromInProgress = optimisticStatus === TaskStatus.IN_PROGRESS && (isAssignee || isAdmin)

  // Only reporter or admin can COMPLETE
  const canComplete = optimisticStatus === TaskStatus.REVIEW && (isReporter || isAdmin)

  const isRestricted = (optimisticStatus === TaskStatus.REVIEW && !canComplete) ||
    (optimisticStatus === TaskStatus.PENDING && !canAdvanceFromPending) ||
    (optimisticStatus === TaskStatus.RECEIVED && !canAdvanceFromReceived) ||
    (optimisticStatus === TaskStatus.IN_PROGRESS && !canAdvanceFromInProgress)

  async function handleAction(nextStatus: TaskStatus) {
    if (isPending || isRestricted) return
    setError(null)

    startTransition(async () => {
      setOptimisticStatus(nextStatus)
      try {
        const result = await advanceTaskStatus(taskId, nextStatus)
        if (!result.success) {
          setError(result.error)
        }
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 w-full">
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
          <div className="flex flex-1 md:flex-none gap-2">
            <button
              className={cn(
                "btn btn-md flex-1 md:min-w-[200px] gap-3 shadow-lg transition-all active:scale-95",
                config.color,
                isPending && "loading",
                isRestricted && "btn-disabled opacity-50 grayscale"
              )}
              onClick={() => handleAction(config.next!)}
              disabled={isPending || isRestricted}
            >
              {isPending ? null : <config.icon className="w-5 h-5" />}
              {isPending ? 'Propagating...' : config.label}
            </button>

            {config.secondary && (
              <button
                className={cn(
                  "btn btn-md gap-2 border-base-300 hover:bg-base-200",
                  config.secondary.color,
                  isPending && "loading",
                  isRestricted && "btn-disabled opacity-50"
                )}
                onClick={() => handleAction(config.secondary!.next)}
                disabled={isPending || isRestricted}
              >
                <config.secondary.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{config.secondary.label}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-success font-black uppercase text-sm px-6 py-3 bg-success/10 rounded-xl border border-success/20">
            <CheckCircle2 className="w-5 h-5" />
            Task Finalized
          </div>
        )}

        {isRestricted && optimisticStatus === TaskStatus.REVIEW && (
          <div className="hidden md:flex items-center gap-2 text-warning font-bold text-[10px] uppercase tracking-tighter max-w-[150px] leading-tight">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Waiting for Initiator Approval
          </div>
        )}

        {isPending && (
          <div className="hidden md:flex items-center gap-2 text-primary font-bold animate-pulse text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            Syncing...
          </div>
        )}
      </div>

      {error && (
        <div className="text-[10px] font-black uppercase text-error px-4 animate-in fade-in slide-in-from-top-1">
          Restriction: {error}
        </div>
      )}
    </div>
  )
}
