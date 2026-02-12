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
  ShieldCheck
} from 'lucide-react'
import SLACountdown from './SLACountdown'
import { TaskStatus } from '@prisma/client'
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
  const [showMembers, setShowMembers] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [reassigningTaskId, setReassigningTaskId] = useState<number | null>(null)
  
  const router = useRouter()

  // --- Filtering & Sorting ---
  const filteredTasks = useMemo(() => {
    let result = tasks

    if (filterMode === 'MINE') {
      result = result.filter(t => t.assigneeId === Number(currentUser.id))
    }

    // Sort: Breached first, then by Due Date
    return result.sort((a, b) => {
      const now = new Date()
      const aDue = new Date(a.dueAt || 0)
      const bDue = new Date(b.dueAt || 0)
      const aBreached = now > aDue && a.status !== 'COMPLETED'
      const bBreached = now > bDue && b.status !== 'COMPLETED'
      
      if (aBreached && !bBreached) return -1
      if (!aBreached && bBreached) return 1
      
      // Urgent tier priority
      const tierMap: any = { 'URGENT': 0, 'STANDARD': 1, 'LOW': 2 }
      const tierDiff = (tierMap[a.sla.tier] || 2) - (tierMap[b.sla.tier] || 2)
      if (tierDiff !== 0) return tierDiff

      return aDue.getTime() - bDue.getTime()
    })
  }, [tasks, filterMode, currentUser.id])

  // --- Stats ---
  const stats = useMemo(() => {
    const active = tasks.filter(t => t.status !== 'COMPLETED')
    const pending = active.filter(t => t.status === 'PENDING')
    const breached = active.filter(t => t.dueAt && new Date() > new Date(t.dueAt))
    
    return {
      totalActive: active.length,
      pendingReceipt: pending.length,
      breached: breached.length
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
        // No need for router.refresh() if optimistic UI is handled well, 
        // but it's good for ensuring data consistency.
        router.refresh()
      } catch (e) {
        console.error(e)
        // Backtrack or show error
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
      alert("Failed to reassign mission")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header & Stats Ribbon */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-primary text-primary-content rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
               <Users className="w-6 h-6" />
             </div>
             <div>
               <h1 className="text-2xl font-black tracking-tighter text-base-content uppercase leading-none">{departmentName} QUEUE</h1>
               <div className="flex items-center gap-2 mt-1">
                 <span className="badge badge-neutral font-bold tracking-wider text-[9px] uppercase px-2 py-0 h-4">Workspace</span>
                 {isManager && <span className="badge badge-warning font-bold text-[9px] uppercase px-2 py-0 h-4">Oversight</span>}
                 <button onClick={() => setShowMembers(!showMembers)} className="badge badge-ghost font-bold text-[9px] uppercase hover:bg-base-200 cursor-pointer px-2 py-0 h-4">
                    {members.length} Agents
                 </button>
               </div>
               
               {showMembers && (
                 <div className="mt-4 p-4 bg-base-100 border border-base-200 rounded-xl shadow-lg absolute z-50 w-64 animate-in fade-in slide-in-from-top-2">
                   <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Active Agents</h4>
                   <div className="space-y-2 max-h-48 overflow-y-auto">
                     {members.map((m: any) => (
                       <div key={m.id} className="flex items-center gap-2 text-xs">
                         <div className="w-1.5 h-1.5 rounded-full bg-success/50" />
                         <span className="truncate">{m.name}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
          </div>

          <div className="flex items-center gap-1 bg-base-100 p-1 rounded-xl border border-base-200 shadow-sm">
            <button 
              onClick={() => setFilterMode('ALL')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                filterMode === 'ALL' ? "bg-base-200 text-base-content" : "text-base-content/50 hover:bg-base-200/50"
              )}
            >
              All Directives
            </button>
            <button 
               onClick={() => setFilterMode('MINE')}
               className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                filterMode === 'MINE' ? "bg-primary text-primary-content shadow-md" : "text-base-content/50 hover:bg-base-200/50"
              )}
            >
              My Assignments
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-base-100 shadow-sm border border-base-200 rounded-xl p-3 flex flex-col">
             <span className="text-[8px] uppercase font-black tracking-widest opacity-40 mb-1">Active Load</span>
             <span className="text-xl font-black text-primary leading-none">{stats.totalActive}</span>
          </div>
          <div className="bg-base-100 shadow-sm border border-base-200 rounded-xl p-3 flex flex-col">
             <span className="text-[8px] uppercase font-black tracking-widest opacity-40 mb-1">Awaiting</span>
             <span className="text-xl font-black text-secondary leading-none">{stats.pendingReceipt}</span>
          </div>
          <div className="bg-base-100 shadow-sm border border-base-200 rounded-xl p-3 flex flex-col">
             <span className="text-[8px] uppercase font-black tracking-widest opacity-40 mb-1">Critical</span>
             <span className="text-xl font-black text-error leading-none">{stats.breached}</span>
          </div>
        </div>
      </div>

      {/* Smart Data Table / Mobile Cards */}
      <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-base-200/40">
              <tr className="text-[9px] font-black uppercase tracking-widest text-base-content/40 border-b border-base-200">
                <th className="py-2 pl-6">Directive</th>
                <th className="py-2">Status</th>
                <th className="py-2">Timeline</th>
                <th className="py-2">Resource</th>
                <th className="py-2 text-right pr-6">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-100">
              {optimisticTasks.map(task => {
                const isCompleted = task.status === 'COMPLETED'
                const isPendingReceipt = task.status === 'PENDING'
                const isProcessing = processingId === task.id
                
                return (
                  <tr key={task.id} className="group hover:bg-base-200/30 transition-colors">
                    <td className="pl-6 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Link href={`/tasks/${task.id}`} className="font-bold text-sm text-base-content hover:text-primary transition-colors flex items-center gap-1.5">
                          {task.title}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="flex items-center gap-2">
                           <span className={cn(
                             "badge badge-xs font-bold border-none",
                             task.sla.tier === 'URGENT' ? "bg-error text-error-content" : "bg-base-300 text-base-content/60"
                           )}>
                             {task.sla.name}
                           </span>
                           <span className="text-[9px] font-mono opacity-40">#{task.id}</span>
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <div className={cn(
                        "badge badge-xs font-bold gap-1 p-2 h-5",
                        task.status === 'PENDING' && "badge-ghost border-base-300 text-base-content/60",
                        task.status === 'IN_PROGRESS' && "badge-primary text-primary-content",
                        task.status === 'AWAITING_INFO' && "badge-secondary text-secondary-content",
                        task.status === 'REVIEW' && "badge-warning text-warning-content",
                        task.status === 'COMPLETED' && "badge-accent text-accent-content"
                      )}>
                        <span className="text-[9px] uppercase tracking-tighter">{task.status.replace('_', ' ')}</span>
                      </div>
                    </td>

                    <td>
                      {task.dueAt && <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />}
                    </td>

                    <td>
                      <div className="flex items-center gap-2">
                         <div className="avatar placeholder">
                           <div className="bg-neutral text-neutral-content rounded-full w-6 h-6 flex items-center justify-center overflow-hidden">
                             <span className="text-[10px] flex items-center justify-center">{task.assignee?.name?.charAt(0)}</span>
                           </div>
                         </div>
                         <div className="flex flex-col">
                           <span className="text-[10px] font-bold">{task.assignee?.name}</span>
                           {(isDeptHead || currentUser.role === 'CLIENT_SERVICE' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
                             <div className="relative">
                               <button 
                                 onClick={() => setReassigningTaskId(reassigningTaskId === task.id ? null : task.id)}
                                 className="text-[8px] text-primary cursor-pointer hover:underline font-black uppercase tracking-widest"
                               >
                                 {reassigningTaskId === task.id ? 'Cancel' : 'Reassign'}
                               </button>
                               
                               {reassigningTaskId === task.id && (
                                 <div className="absolute top-full left-0 z-50 bg-base-100 border border-base-300 rounded-lg shadow-2xl p-2 min-w-[180px] animate-in zoom-in-95">
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {members.map(m => (
                                        <button 
                                          key={m.id}
                                          onClick={() => handleReassign(task.id, m.id)}
                                          className="w-full text-left px-2 py-1 hover:bg-primary hover:text-white rounded-md text-[9px] font-bold transition-colors"
                                        >
                                          {m.name}
                                        </button>
                                      ))}
                                    </div>
                                 </div>
                               )}
                             </div>
                           )}
                         </div>
                      </div>
                    </td>

                    <td className="pr-6">
                       <div className="flex items-center justify-end gap-1.5">
                         {isPendingReceipt && (
                           <button onClick={() => handleStatusChange(task.id, 'RECEIVED')} disabled={isProcessing} className="btn btn-xs h-7 min-h-7 btn-primary font-bold uppercase gap-1 px-3 text-[9px]">
                             <CheckCircle2 className="w-3 h-3" />
                             {isProcessing ? '...' : 'Confirm'}
                           </button>
                         )}

                         {task.status === 'RECEIVED' && (
                           <button onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')} disabled={isProcessing} className="btn btn-xs h-7 min-h-7 btn-outline font-bold uppercase gap-1 px-3 text-[9px]">
                             <Play className="w-3 h-3" />
                             Start
                           </button>
                         )}

                         {task.status === 'IN_PROGRESS' && (
                           <>
                             <PauseTask taskId={task.id} onComplete={() => router.refresh()} />
                             <button onClick={() => handleStatusChange(task.id, 'REVIEW')} disabled={isProcessing} className="btn btn-xs h-7 min-h-7 btn-success font-bold uppercase gap-1 px-3 text-[9px] text-white">
                               Done
                             </button>
                           </>
                         )}

                         {task.status === 'AWAITING_INFO' && (
                            <button onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')} disabled={isProcessing} className="btn btn-xs h-7 min-h-7 btn-info font-bold uppercase gap-1 px-3 text-[9px]">
                              <Play className="w-3 h-3" />
                              Resume
                            </button>
                         )}
                       </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-base-100">
          {optimisticTasks.map(task => {
            const isCompleted = task.status === 'COMPLETED'
            const isPendingReceipt = task.status === 'PENDING'
            const isProcessing = processingId === task.id
            
            return (
              <div key={task.id} className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <Link href={`/tasks/${task.id}`} className="font-bold text-sm text-base-content">
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-2">
                       <span className={cn(
                         "badge badge-xs font-bold border-none",
                         task.sla.tier === 'URGENT' ? "bg-error text-error-content" : "bg-base-300 text-base-content/60"
                       )}>
                         {task.sla.name}
                       </span>
                       <span className="text-[9px] font-mono opacity-40">#{task.id}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "badge badge-xs font-bold p-2 h-5 text-[8px] uppercase tracking-tighter",
                    task.status === 'PENDING' && "badge-ghost",
                    task.status === 'IN_PROGRESS' && "badge-primary",
                    task.status === 'AWAITING_INFO' && "badge-secondary",
                    task.status === 'REVIEW' && "badge-warning",
                    task.status === 'COMPLETED' && "badge-accent"
                  )}>
                    {task.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-base-200/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="avatar placeholder">
                       <div className="bg-neutral text-neutral-content rounded-full w-6 h-6 flex items-center justify-center overflow-hidden">
                         <span className="text-[10px] flex items-center justify-center">{task.assignee?.name?.charAt(0)}</span>
                       </div>
                    </div>
                    <span className="text-[10px] font-bold">{task.assignee?.name || 'Unassigned'}</span>
                  </div>
                  {task.dueAt && <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />}
                </div>

                <div className="flex gap-2">
                   {isPendingReceipt && (
                     <button onClick={() => handleStatusChange(task.id, 'RECEIVED')} disabled={isProcessing} className="btn btn-sm btn-primary flex-1 font-bold h-9 min-h-9 text-[10px] uppercase">
                       Confirm Receipt
                     </button>
                   )}
                   {task.status === 'RECEIVED' && (
                     <button onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')} disabled={isProcessing} className="btn btn-sm btn-outline flex-1 font-bold h-9 min-h-9 text-[10px] uppercase">
                       Start Task
                     </button>
                   )}
                   {task.status === 'IN_PROGRESS' && (
                     <>
                        <button onClick={() => handleStatusChange(task.id, 'REVIEW')} disabled={isProcessing} className="btn btn-sm btn-success flex-1 font-bold text-white h-9 min-h-9 text-[10px] uppercase">
                          Mark Done
                        </button>
                     </>
                   )}
                </div>
              </div>
            )
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="py-12 text-center text-base-content/30 border-t border-base-200">
             <div className="flex flex-col items-center gap-2">
                <Filter className="w-8 h-8 opacity-20" />
                <span className="text-[10px] font-black uppercase tracking-widest">No Directives Found</span>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
