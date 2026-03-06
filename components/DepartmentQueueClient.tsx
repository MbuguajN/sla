'use client'

import React, { useState, useMemo, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Filter,
  MessageCircle,
  Clock,
  ExternalLink,
  Play,
  Pause,
  CheckCircle2,
  AlertOctagon,
  MoreHorizontal,
  ShieldCheck,
  ChevronRight,
  UserPlus
} from 'lucide-react'
import SLACountdown from './SLACountdown'
import { TaskStatus } from '@/lib/enums'
import { cn } from '@/lib/utils'
import { advanceTaskStatus, pauseTask, assignTask } from '@/app/actions/taskActions'
import PauseTask from './PauseTask'

type Props = {
  departmentName: string
  currentUser: any
  tasks: any[]
  isManager: boolean
  isDeptHead: boolean
  members: any[]
}

export default function DepartmentQueueClient({
  departmentName,
  currentUser,
  tasks,
  isManager,
  isDeptHead,
  members
}: Props) {
  const [filterMode, setFilterMode] = useState<'ALL' | 'MINE'>('ALL')
  const [tabMode, setTabMode] = useState<'ongoing' | 'completed'>('ongoing')
  const [showMembers, setShowMembers] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [reassigningTaskId, setReassigningTaskId] = useState<number | null>(null)
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM'

  const router = useRouter()

  // --- Filtering & Sorting ---
  const filteredTasks = useMemo(() => {
    let result = tasks

    if (filterMode === 'MINE') {
      result = result.filter(t => t.assigneeId === Number(currentUser.id))
    }

    // Tab filter: ongoing vs completed
    if (tabMode === 'ongoing') {
      result = result.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.DISMISSED)
    } else {
      result = result.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.DISMISSED)
    }

    // Sort: Breached first, then by Due Date
    return result.sort((a, b) => {
      const now = new Date()
      const aDue = new Date(a.dueAt || 0)
      const bDue = new Date(b.dueAt || 0)
      const aBreached = now > aDue && a.status !== TaskStatus.COMPLETED
      const bBreached = now > bDue && b.status !== TaskStatus.COMPLETED

      if (aBreached && !bBreached) return -1
      if (!aBreached && bBreached) return 1

      // Urgent tier priority
      const tierMap: any = { 'URGENT': 0, 'STANDARD': 1, 'LOW': 2 }
      const tierDiff = (tierMap[a.sla.tier] || 2) - (tierMap[b.sla.tier] || 2)
      if (tierDiff !== 0) return tierDiff

      return aDue.getTime() - bDue.getTime()
    })
  }, [tasks, filterMode, tabMode, currentUser.id])

  // --- Stats ---
  const stats = useMemo(() => {
    const active = tasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.DISMISSED)
    const pending = active.filter(t => t.status === TaskStatus.PENDING)
    const breached = active.filter(t => t.dueAt && new Date() > new Date(t.dueAt))
    const unassigned = active.filter(t => !t.assigneeId)

    return {
      totalActive: active.length,
      pendingReceipt: pending.length,
      breached: breached.length,
      unassigned: unassigned.length
    }
  }, [tasks])

  // --- Optimistic UI for Task List ---
  const [optimisticTasks, setOptimisticTaskStatus] = useOptimistic(
    filteredTasks,
    (state, { taskId, newStatus }: { taskId: number, newStatus: TaskStatus }) => {
      return state.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    }
  )

  // --- Actions ---
  async function handleStatusChange(taskId: number, newStatus: TaskStatus) {
    setProcessingId(taskId)

    React.startTransition(async () => {
      setOptimisticTaskStatus({ taskId, newStatus })
      try {
        await advanceTaskStatus(taskId, newStatus)
        router.refresh()
      } catch (e) {
        console.error(e)
        alert("Failed to update status")
      } finally {
        setProcessingId(null)
      }
    })
  }

  async function handleReassign(taskId: number, newAssigneeId: number) {
    setProcessingId(taskId)
    try {
      await assignTask(taskId, newAssigneeId)
      setReassigningTaskId(null)
      router.refresh()
    } catch (e) {
      console.error(e)
      alert("Failed to reassign task")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-10 animate-fade-in-up pb-20">

      {/* Header & Controls Section */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-base-content/5">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary text-white rounded-3xl flex items-center justify-center shadow-ruby-soft relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              <Users className="w-7 h-7 transform group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-1.5 focus-within:">
              <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs opacity-70">
                <ShieldCheck className="w-3 h-3" />
                Active Tasks
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-base-content leading-none">{departmentName}</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Users size={10} /> {members.length} Team Members <ChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center p-1.5 bg-base-content/5 rounded-2xl border border-base-content/5 backdrop-blur-md">
            <button
              onClick={() => setFilterMode('ALL')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filterMode === 'ALL' ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-base-content/40 hover:text-base-content/60"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setFilterMode('MINE')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filterMode === 'MINE' ? "bg-primary text-white shadow-ruby-soft" : "text-base-content/40 hover:text-base-content/60"
              )}
            >
              My Assignments
            </button>
          </div>
        </div>

        {/* Flat Enterprise KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Active', value: stats.totalActive, sub: 'Currently in queue', color: 'text-base-content' },
            { label: 'Pending Receipt', value: stats.pendingReceipt, sub: 'Needs acknowledgment', color: 'text-secondary' },
            { label: 'Unassigned', value: stats.unassigned, sub: 'Awaiting handler', color: 'text-warning' },
            { label: 'SLA Breached', value: stats.breached, sub: 'Critical attention', color: 'text-error' },
          ].map((kpi, i) => (
            <div key={i} className="bg-base-100 border border-base-content/10 p-5 rounded-2xl space-y-1 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-base-content/[0.02] rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-base-content/25 block relative z-10">{kpi.label}</span>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className={cn("text-2xl font-bold tracking-tight", kpi.color)}>{kpi.value}</span>
                <span className="text-[9px] font-normal text-base-content/20 italic">{kpi.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Environment */}
      <div className="relative">
        <div className="glass-panel rounded-[2.5rem] overflow-hidden shadow-soft border border-base-content/5 transition-all duration-500">
          {/* List Toggle */}
          <div className="flex items-center gap-1 p-3 border-b border-base-content/5 bg-base-content/[0.02]">
            {['ongoing', 'completed'].map((mode) => (
              <button
                key={mode}
                onClick={() => setTabMode(mode as any)}
                className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                  tabMode === mode ? "bg-white dark:bg-primary/10 text-primary shadow-sm" : "text-base-content/30 hover:text-base-content/50"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Global Dispatch Table */}
          <div className="hidden md:block overflow-x-auto px-4">
            <table className="premium-table">
              <thead>
                <tr>
                  <th className="rounded-tl-2xl uppercase tracking-widest text-[10px] py-6 px-6">Directives</th>
                  <th className="uppercase tracking-widest text-[10px]">Status</th>
                  <th className="uppercase tracking-widest text-[10px]">Deadline</th>
                  <th className="rounded-tr-2xl uppercase tracking-widest text-[10px]">Handler</th>
                </tr>
              </thead>
              <tbody>
                {optimisticTasks.map(task => {
                  const isCompleted = task.status === TaskStatus.COMPLETED
                  const isPendingReceipt = task.status === TaskStatus.PENDING
                  const isProcessing = processingId === task.id

                  return (
                    <tr key={task.id} className="group hover:bg-base-content/[0.01] transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <Link href={`/tasks/${task.id}`} className="font-bold text-[14px] text-base-content/90 group-hover:text-primary transition-all flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                            {task.title}
                          </Link>
                          <div className="flex items-center gap-3 pl-3.5">
                            <span className={cn(
                              "text-[8px] font-black tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-md border border-base-content/10",
                              task.sla.tier === 'URGENT' ? "text-error border-error/20 bg-error/5" : "text-base-content/30"
                            )}>
                              {task.sla.name}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-base-content/15">ID#{task.id}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest",
                          task.status === TaskStatus.PENDING && "bg-base-content/5 text-base-content/40",
                          task.status === TaskStatus.IN_PROGRESS && "bg-primary/10 text-primary",
                          task.status === TaskStatus.AWAITING_INFO && "bg-secondary/10 text-secondary",
                          task.status === TaskStatus.REVIEW && "bg-warning/10 text-warning",
                          task.status === TaskStatus.COMPLETED && "bg-success/10 text-success"
                        )}>
                          <span className={cn(
                            "w-1 h-1 rounded-full",
                            task.status === TaskStatus.IN_PROGRESS ? "bg-primary animate-pulse" : "bg-current"
                          )} />
                          {task.status.replace(/_/g, ' ')}
                        </div>
                      </td>

                      <td>
                        {task.dueAt && (
                          <div className="transform transition-transform group-hover:scale-105 origin-left">
                            <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />
                          </div>
                        )}
                      </td>

                      <td className="relative">
                        <div className="flex items-center gap-4">
                          {task.assignee ? (
                            <div className="flex items-center gap-3 bg-base-content/[0.03] pr-4 py-1.5 rounded-2xl group/avatar transition-all hover:bg-base-content/[0.06]">
                              <div className="w-8 h-8 ring-2 ring-primary/20 bg-primary/10 text-primary rounded-full flex items-center justify-center leading-none shrink-0 overflow-hidden shadow-sm">
                                {task.assignee?.avatarUrl ? (
                                  <img src={task.assignee.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[10px] font-black flex items-center justify-center w-full h-full translate-y-[0.5px]">{task.assignee?.name?.charAt(0)}</span>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-bold text-base-content/80 truncate leading-tight">{task.assignee?.name}</span>
                                {(isDeptHead || isManager || isAdmin) && !isCompleted && (
                                  <button
                                    onClick={() => setReassigningTaskId(reassigningTaskId === task.id ? null : task.id)}
                                    className="text-[8px] font-black text-primary uppercase tracking-widest opacity-0 group-hover/avatar:opacity-100 transition-opacity hover:underline"
                                  >
                                    Reassign
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-black italic text-warning/50 uppercase tracking-widest">Unassigned</span>
                              {(isDeptHead || isManager || isAdmin) && !isCompleted && (
                                <button
                                  onClick={() => setReassigningTaskId(reassigningTaskId === task.id ? null : task.id)}
                                  className="inline-flex items-center gap-2 group/btn"
                                >
                                  <span className="p-1.5 rounded-lg bg-warning/10 text-warning group-hover/btn:bg-warning group-hover/btn:text-white transition-all shadow-sm">
                                    <UserPlus size={12} />
                                  </span>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-warning opacity-60 group-hover/btn:opacity-100 transition-opacity">Assign</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Reassign Dropdown Refinement */}
                          {reassigningTaskId === task.id && (
                            <div className="absolute top-1/2 -translate-y-1/2 right-full mr-6 z-50 w-72 bg-base-100 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-base-content/5 p-6 animate-in fade-in slide-in-from-right-6 duration-300 overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-5 px-1">
                                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                    <UserPlus size={16} />
                                  </div>
                                  <div>
                                    <h5 className="text-[11px] font-black uppercase tracking-widest text-base-content/80">Reassign Workflow</h5>
                                    <p className="text-[9px] font-bold text-base-content/30 uppercase tracking-wider">Select New Handler</p>
                                  </div>
                                </div>

                                <div className="space-y-1.5 max-h-[280px] overflow-y-auto premium-scrollbar pr-1 -mr-1">
                                  {members.filter(m => m.id !== task.assigneeId).map(m => (
                                    <button
                                      key={m.id}
                                      onClick={() => handleReassign(task.id, m.id)}
                                      className="w-full text-left p-3 hover:bg-primary hover:text-white rounded-[1.25rem] text-xs font-bold transition-all flex items-center gap-3 group/item border border-transparent hover:border-primary/20 hover:shadow-lg hover:shadow-primary/20 active:scale-95"
                                    >
                                      <div className="w-8 h-8 rounded-xl bg-base-content/5 flex items-center justify-center leading-none group-hover/item:bg-white/20 transition-colors overflow-hidden shrink-0">
                                        {m.avatarUrl ? (
                                          <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-[10px] font-black translate-y-[0.5px]">{m.name.charAt(0)}</span>
                                        )}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="truncate">{m.name}</span>
                                        <span className="text-[9px] font-bold opacity-40 group-hover/item:opacity-70 transition-opacity uppercase tracking-widest">
                                          {m.role || 'Agent'}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                  {members.filter(m => m.id !== task.assigneeId).length === 0 && (
                                    <div className="py-8 text-center bg-base-content/[0.02] rounded-3xl border border-dashed border-base-content/5">
                                      <p className="text-[10px] font-bold text-base-content/20 uppercase tracking-widest">No other members</p>
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => setReassigningTaskId(null)}
                                  className="w-full mt-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-base-content/20 hover:text-error hover:bg-error/5 transition-all"
                                >
                                  Cancel Assignment
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Environment Restyle */}
          <div className="md:hidden divide-y divide-base-content/5">
            {optimisticTasks.map(task => {
              const isCompleted = task.status === TaskStatus.COMPLETED
              const isPendingReceipt = task.status === TaskStatus.PENDING
              const isProcessing = processingId === task.id

              return (
                <div key={task.id} className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <Link href={`/tasks/${task.id}`} className="font-extrabold text-[15px] text-base-content leading-tight">
                        {task.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded border border-base-content/10",
                          task.sla.tier === 'URGENT' ? "text-error border-error/20 bg-error/5" : "text-base-content/30"
                        )}>
                          {task.sla.name}
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest",
                      task.status === TaskStatus.PENDING && "bg-base-content/5 text-base-content/40",
                      task.status === TaskStatus.IN_PROGRESS && "bg-primary text-white shadow-ruby-soft"
                    )}>
                      {task.status.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-base-content/[0.03] rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center leading-none font-bold text-[10px]">
                        {task.assignee?.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-[11px] font-bold text-base-content/60">{task.assignee?.name || 'Unassigned'}</span>
                    </div>
                    {task.dueAt && <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />}
                  </div>

                  <div className="flex gap-3">
                    {isPendingReceipt && (
                      <button onClick={() => handleStatusChange(task.id, TaskStatus.RECEIVED)} disabled={isProcessing} className="flex-1 h-12 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-ruby-soft">
                        Acknowledge
                      </button>
                    )}
                    {task.status === TaskStatus.RECEIVED && (
                      <button onClick={() => handleStatusChange(task.id, TaskStatus.IN_PROGRESS)} disabled={isProcessing} className="flex-1 h-12 glass-panel text-primary rounded-2xl font-black text-[11px] uppercase tracking-widest">
                        Start
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
