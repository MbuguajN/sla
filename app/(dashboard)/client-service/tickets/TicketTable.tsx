'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { processTicket, dismissTicket } from '@/app/actions/taskActions'
import { ArrowRight, Ticket, User, Calendar, Settings2, Loader2, CheckCircle2, Inbox as InboxIcon, Clock, CheckCircle, ListTodo, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type TabType = 'NEW' | 'IN_PROGRESS' | 'DONE'

export default function TicketTable({ initialTickets, departments, slas, users }: { 
  initialTickets: any[], 
  departments: any[], 
  slas: any[],
  users: any[]
}) {
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabType>('NEW')
  const router = useRouter()
  
  const [assignment, setAssignment] = useState({
    departmentId: '',
    slaId: '',
    assigneeId: '',
    description: '',
    dueAt: ''
  })

  const filteredTickets = useMemo(() => {
    return initialTickets.filter(t => {
      if (activeTab === 'NEW') return t.status === 'PENDING' || t.status === 'RECEIVED'
      if (activeTab === 'IN_PROGRESS') return ['IN_PROGRESS', 'REVIEW', 'AWAITING_INFO'].includes(t.status)
      if (activeTab === 'DONE') return t.status === 'COMPLETED'
      return false
    })
  }, [initialTickets, activeTab])

  async function handleProcess() {
    if (!assignment.departmentId || !assignment.slaId || !selectedTicket) return

    const ticketId = selectedTicket.id
    
    startTransition(async () => {
      try {
        // Close modal early for feel
        const modal = document.getElementById('process_modal') as any
        if (modal) modal.close()

        await processTicket(
          ticketId, 
          Number(assignment.departmentId), 
          assignment.slaId ? Number(assignment.slaId) : undefined,
          assignment.assigneeId ? Number(assignment.assigneeId) : undefined,
          { 
            description: assignment.description || undefined,
            dueAt: assignment.dueAt ? new Date(assignment.dueAt) : undefined
          }
        )
        
        setSelectedTicket(null)
        setAssignment({ departmentId: '', slaId: '', assigneeId: '', description: '', dueAt: '' })
        router.refresh()
      } catch (err) {
        console.error(err)
        alert('Strategic failure in ticket propagation.')
      }
    })
  }

  async function handleDismiss() {
    if (!selectedTicket) return

    startTransition(async () => {
      try {
        const modal = document.getElementById('process_modal') as any
        if (modal) modal.close()

        await dismissTicket(selectedTicket.id)
        
        setSelectedTicket(null)
        router.refresh()
      } catch (err) {
        console.error(err)
        alert('Failed to dismiss ticket.')
      }
    })
  }

  const tabs = [
    { id: 'NEW' as TabType, label: 'Unprocessed', icon: InboxIcon, color: 'text-primary' },
    { id: 'IN_PROGRESS' as TabType, label: 'Operational', icon: Clock, color: 'text-warning' },
    { id: 'DONE' as TabType, label: 'Resolved', icon: CheckCircle, color: 'text-success' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex items-center px-6 border-b border-base-200 bg-base-100/50 backdrop-blur-md sticky top-0 z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
              activeTab === tab.id 
                ? cn("border-primary text-primary bg-primary/5") 
                : "border-transparent text-base-content/40 hover:text-base-content/60 hover:bg-base-200/50"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "opacity-40")} />
            {tab.label}
            <span className={cn(
              "ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black",
              activeTab === tab.id ? "bg-primary text-primary-content" : "bg-base-200 text-base-content/40"
            )}>
              {initialTickets.filter(t => {
                if (tab.id === 'NEW') return t.status === 'PENDING' || t.status === 'RECEIVED'
                if (tab.id === 'IN_PROGRESS') return ['IN_PROGRESS', 'REVIEW', 'AWAITING_INFO'].includes(t.status)
                if (tab.id === 'DONE') return t.status === 'COMPLETED'
                return false
              }).length}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="bg-base-200/30 border-b border-base-200">
              <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40 pl-6">Directive / Reference</th>
              <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Strategic Origin</th>
              <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Ingestion Path</th>
              <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Status</th>
              <th className="text-right pr-6"></th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-24">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <ListTodo className="w-16 h-16 stroke-[1]" />
                    <span className="text-xs font-black uppercase tracking-[0.3em]">No Active Assets in this Vector</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="py-5 pl-6">
                     <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                         activeTab === 'NEW' ? "bg-primary/10 text-primary" : 
                         activeTab === 'IN_PROGRESS' ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                       )}>
                          <Ticket className="w-5 h-5" />
                       </div>
                       <div className="flex flex-col">
                         <span className="font-black text-sm text-base-content tracking-tight">{ticket.title}</span>
                         <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">REF: #{ticket.id.toString().padStart(6, '0')}</span>
                       </div>
                     </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-base-content/80">
                        {ticket.senderName || ticket.reporter?.name || 'EXTERNAL_ENTITY'}
                      </span>
                      <span className="text-[10px] opacity-40 font-bold tabular-nums">
                        {ticket.senderEmail || ticket.reporter?.email || 'SYSTEM_NODE'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-base-content/40 uppercase tracking-widest">
                        {ticket.senderEmail ? 'GMAIL_CLUSTER' : 'INTERNAL_DIRECTIVE'}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums text-base-content/60">
                        {format(new Date(ticket.createdAt), 'MMM dd | HH:mm')}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={cn(
                      "badge badge-sm font-black text-[9px] uppercase tracking-tighter h-5 px-3 border-none",
                      ticket.status === 'PENDING' ? "bg-base-200 text-base-content/60" :
                      ticket.status === 'IN_PROGRESS' ? "bg-warning/20 text-warning" :
                      ticket.status === 'REVIEW' ? "bg-info/20 text-info" :
                      ticket.status === 'COMPLETED' ? "bg-success/20 text-success" : "bg-error/20 text-error"
                    )}>
                      {ticket.status.replace('_', ' ')}
                    </div>
                  </td>
                   <td className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'NEW' && (
                          <button 
                            className="btn btn-ghost btn-sm text-error hover:bg-error/10 font-black uppercase tracking-widest gap-2"
                            onClick={() => {
                              setSelectedTicket(ticket)
                              // We can reuse the handleDismiss from the modal or just call dismissTicket here.
                              // For consistency with existing logic, let's show the modal first or just trigger it.
                              const modal = document.getElementById('process_modal') as any
                              if (modal) modal.showModal()
                            }}
                            title="Dismiss Directive"
                          >
                            <XCircle className="w-4 h-4" />
                            <span className="hidden xl:inline">Dismiss</span>
                          </button>
                        )}
                        {activeTab === 'DONE' ? (
                          <Link 
                            href={`/tasks/${ticket.id}`}
                            className="btn btn-ghost btn-sm font-black uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                          >
                            View <ArrowRight className="w-4 h-4" />
                          </Link>
                        ) : (
                          <button 
                            className="btn btn-primary btn-sm font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20"
                            onClick={() => {
                                setSelectedTicket(ticket)
                                const modal = document.getElementById('process_modal') as any
                                if (modal) modal.showModal()
                            }}
                          >
                            Manage <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                   </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Process Modal */}
      <dialog id="process_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box border-2 border-primary/20 shadow-[0_0_50px_rgba(0,0,0,0.3)] p-0 overflow-hidden max-w-xl bg-base-100 rounded-3xl">
          <div className="bg-primary p-8 text-primary-content relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                    <Settings2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-black uppercase tracking-tighter text-2xl">Operational Routing</h3>
               </div>
               {selectedTicket && (
                 <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-2">Target Directive</p>
                    <p className="font-bold text-lg leading-tight">{selectedTicket.title}</p>
                 </div>
               )}
             </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="form-control w-full">
                   <label className="label">
                     <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Department Assignment</span>
                   </label>
                   <select 
                     className="select select-bordered w-full font-bold h-12 bg-base-200/50 border-base-300 transition-all focus:border-primary"
                     value={assignment.departmentId}
                     onChange={(e) => setAssignment(prev => ({ ...prev, departmentId: e.target.value }))}
                   >
                     <option value="" disabled>Select Department...</option>
                     {departments.map(d => (
                       <option key={d.id} value={d.id}>{d.name}</option>
                     ))}
                   </select>
                </div>

                {!assignment.dueAt && (
                  <div className="form-control w-full">
                     <label className="label">
                       <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Strategic SLA Tier</span>
                     </label>
                     <select 
                       className="select select-bordered w-full font-bold h-12 bg-base-200/50 border-base-300 transition-all focus:border-primary"
                       value={assignment.slaId}
                       onChange={(e) => setAssignment(prev => ({ ...prev, slaId: e.target.value }))}
                     >
                       <option value="" disabled>Select SLA Tier...</option>
                       {slas.map(s => (
                         <option key={s.id} value={s.id}>{s.name} ({s.tier})</option>
                       ))}
                     </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Personnel Allocation (Optional)</span>
                  </label>
                  <select 
                    className="select select-bordered w-full font-bold h-12 bg-base-200/50 border-base-300 transition-all focus:border-primary text-sm"
                    value={assignment.assigneeId}
                    onChange={(e) => setAssignment(prev => ({ ...prev, assigneeId: e.target.value }))}
                  >
                    <option value="">Awaiting Resource Allocation...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} [{u.role}] {u.department ? ` - ${u.department.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50 text-warning">Manual Operational Deadline</span>
                  </label>
                  <input 
                    type="datetime-local" 
                    className="input input-bordered w-full font-bold h-12 bg-base-200/50 border-base-300 transition-all focus:border-warning"
                    value={assignment.dueAt}
                    onChange={(e) => setAssignment(prev => ({ ...prev, dueAt: e.target.value, slaId: e.target.value ? '1' : '' }))}
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-50">Directive Context / Description</span>
                </label>
                <textarea 
                  className="textarea textarea-bordered w-full font-bold bg-base-200/50 border-base-300 transition-all focus:border-primary min-h-[100px]"
                  placeholder="Provide additional operational context for this directive..."
                  value={assignment.description}
                  onChange={(e) => setAssignment(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="pt-6 flex flex-col gap-4">
                <button 
                  className="btn btn-primary btn-block h-14 min-h-14 shadow-2xl shadow-primary/30 gap-3 font-black uppercase tracking-widest text-sm"
                  disabled={isPending || !assignment.departmentId || (!assignment.slaId && !assignment.dueAt)}
                  onClick={handleProcess}
                >
                  {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                  {isPending ? 'Propagating Directive...' : 'Finalize Operational Route'}
                </button>
                
                <button 
                  className="btn btn-error btn-outline btn-block h-12 gap-3 font-black uppercase tracking-widest text-xs"
                  disabled={isPending}
                  onClick={handleDismiss}
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Dismiss Directive
                </button>
                <button 
                  className="btn btn-ghost btn-sm font-black uppercase tracking-[0.2em] text-[10px] opacity-40 hover:opacity-100"
                  onClick={() => {
                     const modal = document.getElementById('process_modal') as any
                     if (modal) modal.close()
                  }}
                >
                  Abort Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  )
}
