'use client'

import React, { useOptimistic, useTransition } from 'react'
import { TaskStatus } from '@prisma/client'
import { advanceTaskStatus } from '@/app/actions/taskActions'
import SLACountdown from './SLACountdown'
import { CheckCircle2, Play, ArrowRight, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Task = {
  id: number
  title: string
  status: TaskStatus
  dueAt: Date | null
}

export default function MyActiveTasks({ initialTasks }: { initialTasks: any[] }) {
  const [isPending, startTransition] = useTransition()
  
  // We use useOptimistic for immediate removal from the list upon completion or receipt
  const [optimisticTasks, updateOptimisticTasks] = useOptimistic(
    initialTasks,
    (state, { taskId, newStatus }: { taskId: number, newStatus: TaskStatus }) => 
      state.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
      .filter(t => t.status !== TaskStatus.COMPLETED)
  )

  async function handleQuickAction(taskId: number, currentStatus: TaskStatus) {
    let next: TaskStatus | null = null
    if (currentStatus === TaskStatus.PENDING) next = TaskStatus.RECEIVED
    if (currentStatus === TaskStatus.IN_PROGRESS || currentStatus === TaskStatus.RECEIVED || currentStatus === TaskStatus.REVIEW) {
      next = TaskStatus.COMPLETED
    }

    if (!next || isPending) return

    const targetNext = next
    startTransition(async () => {
      updateOptimisticTasks({ taskId, newStatus: targetNext })
      await advanceTaskStatus(taskId, targetNext)
    })
  }

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-base-200 bg-base-200/20 flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-base-content">My Urgent Directives</h3>
          <span className="text-[8px] font-bold text-base-content/40 tracking-tight uppercase">Quick Action Control</span>
        </div>
        <div className="text-primary font-bold text-[8px] uppercase tracking-widest">{optimisticTasks.length} Active</div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-0.5">
        {optimisticTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 opacity-30 gap-1">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase tracking-widest">All Cleared</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {optimisticTasks.map(task => (
              <div key={task.id} className="p-2 bg-base-100 hover:bg-base-200/50 rounded-lg transition-all border border-transparent hover:border-base-200 group">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex flex-col gap-0 overflow-hidden">
                    <span className="text-[10px] font-bold truncate text-base-content group-hover:text-primary transition-colors">{task.title}</span>
                    <div className="flex items-center gap-1">
                       <span className="text-[6px] font-black uppercase tracking-tighter text-base-content/40">{task.status}</span>
                       {task.dueAt && <SLACountdown dueDate={task.dueAt} isCompleted={false} />}
                    </div>
                  </div>
                  <Link href={`/tasks/${task.id}`} className="btn btn-ghost btn-xs btn-circle scale-90 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    className={cn(
                      "btn btn-xs flex-1 font-bold uppercase text-[9px] tracking-widest gap-1.5 h-7 min-h-7",
                      task.status === TaskStatus.PENDING ? "btn-primary" : "btn-success"
                    )}
                    onClick={() => handleQuickAction(task.id, task.status)}
                    disabled={isPending}
                  >
                    {task.status === TaskStatus.PENDING ? (
                      <><Play className="w-2.5 h-2.5" /> Confirm</>
                    ) : (
                      <><CheckCircle2 className="w-2.5 h-2.5" /> Done</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
