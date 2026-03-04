'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { processTicket, dismissTicket, advanceTaskStatus } from '@/app/actions/taskActions'
import { ArrowRight, Ticket, User, Calendar, Settings2, Loader2, CheckCircle2, Inbox as InboxIcon, Clock, CheckCircle, ListTodo, XCircle, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type TabType = 'NEW' | 'IN_PROGRESS' | 'DONE'

export default function TicketTable({ initialTickets, departments, slas, users, currentUserId, userRole, userDept }: {
  initialTickets: any[],
  departments: any[],
  slas: any[],
  users: any[],
  currentUserId: number,
  userRole: string,
  userDept: string
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

  // Auto-fill assignment data when ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      setAssignment(prev => ({
        ...prev,
        departmentId: selectedTicket.departmentId?.toString() || '',
        slaId: (selectedTicket.project?.defaultSlaId || selectedTicket.slaId || '').toString(),
        dueAt: selectedTicket.dueAt ? format(new Date(selectedTicket.dueAt), "yyyy-MM-dd'T'HH:mm") : ''
      }))
    }
  }, [selectedTicket])

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
        alert('Failed to assign brief.')
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
    { id: 'NEW' as TabType, label: 'Incoming Briefs', icon: InboxIcon, color: 'text-primary' },
    { id: 'IN_PROGRESS' as TabType, label: 'In Progress', icon: Clock, color: 'text-warning' },
    { id: 'DONE' as TabType, label: 'Archived Briefs', icon: CheckCircle, color: 'text-success' },
  ]

  const isCS = userDept === 'CLIENT_SERVICE' || userDept === 'CLIENT SERVICE'
  const isBD = userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT'
  const canManage = !isCS && !isBD && (userRole === 'MANAGER' || userRole === 'ADMIN' || userRole === 'CEO' || userRole === 'HR')

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Tab Navigation */}
      <div className="flex items-center px-6 border-b border-base-200 bg-base-100/30 backdrop-blur-xl sticky top-0 z-10 gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-6 py-5 text-xs font-bold transition-all relative",
              activeTab === tab.id
                ? "text-primary"
                : "text-base-content/40 hover:text-base-content/60 hover:bg-base-200/30"
            )}
          >
            <tab.icon className={cn("w-4 h-4 transition-colors", activeTab === tab.id ? tab.color : "opacity-30")} />
            {tab.label}
            <span className={cn(
              "ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
              activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-base-200/50 text-base-content/40"
            )}>
              {initialTickets.filter(t => {
                if (tab.id === 'NEW') return t.status === 'PENDING' || t.status === 'RECEIVED'
                if (tab.id === 'IN_PROGRESS') return ['IN_PROGRESS', 'REVIEW', 'AWAITING_INFO'].includes(t.status)
                if (tab.id === 'DONE') return t.status === 'COMPLETED'
                return false
              }).length}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(var(--p),0.4)]" />
            )}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto premium-scrollbar">
        <table className="table w-full min-w-[1000px]">
          <thead>
            <tr className="bg-base-200/20 border-b border-base-200/50">
              <th className="py-4 pl-6 w-[30%]">Brief / Reference</th>
              <th className="py-4 w-[20%]">Origin</th>
              <th className="py-4 w-[15%]">Received</th>
              <th className="py-4 w-[12%] text-center">Status</th>
              <th className="py-4 text-right pr-6 w-[23%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-32 border-none">
                  <div className="flex flex-col items-center gap-4 opacity-10">
                    <ListTodo className="w-20 h-20 stroke-[1]" />
                    <span className="text-sm font-bold uppercase tracking-[0.4em]">No briefs found</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-primary/[0.03] transition-colors group">
                  <td className="py-4 pl-6 border-b border-base-100">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner border transition-all",
                        activeTab === 'NEW' ? "bg-primary/5 text-primary border-primary/20" :
                          activeTab === 'IN_PROGRESS' ? "bg-warning/5 text-warning border-warning/20" : "bg-success/5 text-success border-success/20"
                      )}>
                        <Ticket className="w-4 h-4 opacity-80" />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-bold text-sm text-base-content tracking-tight group-hover:text-primary transition-colors truncate">{ticket.title}</span>
                        <span className="text-[10px] font-medium opacity-20 uppercase tracking-wider">REF-{ticket.id.toString().padStart(4, '0')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 border-b border-base-100">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-bold text-base-content/80 truncate">
                        {ticket.senderName || ticket.reporter?.name || 'External'}
                      </span>
                      <span className="text-[10px] opacity-30 font-medium truncate">
                        {ticket.senderEmail || ticket.reporter?.email || 'System'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 border-b border-base-100">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-base-content/30 uppercase tracking-wider">
                        {ticket.senderEmail ? 'External' : 'Internal'}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums text-base-content/50">
                        {format(new Date(ticket.createdAt), 'MMM dd • HH:mm')}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 border-b border-base-100 text-center">
                    <div className={cn(
                      "badge badge-sm font-bold text-[10px] uppercase tracking-wide px-3 py-1 h-auto whitespace-nowrap border-none shadow-sm",
                      ticket.status === 'PENDING' ? "bg-base-200/50 text-base-content/40" :
                        ticket.status === 'IN_PROGRESS' ? "bg-warning/10 text-warning" :
                          ticket.status === 'REVIEW' ? "bg-info/10 text-info" :
                            ticket.status === 'COMPLETED' ? "bg-success/10 text-success" : "bg-error/10 text-error"
                    )}>
                      {ticket.status.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="py-4 text-right pr-6 border-b border-base-100 min-w-[200px]">
                    <div className="flex items-center justify-end gap-2 flex-nowrap">
                      {activeTab === 'NEW' && (ticket.reporterId === currentUserId || userRole === 'ADMIN') && (
                        <button
                          className="btn btn-ghost btn-sm text-error/40 hover:text-error hover:bg-error/5 font-bold gap-2 text-[10px] h-9 px-3 rounded-xl whitespace-nowrap border border-transparent hover:border-error/10"
                          onClick={() => {
                            setSelectedTicket(ticket)
                            const modal = document.getElementById('process_modal') as any
                            if (modal) modal.close()
                            handleDismiss()
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Dismiss</span>
                        </button>
                      )}
                      {activeTab === 'DONE' ? (
                        <Link
                          href={`/tasks/${ticket.id}`}
                          className="btn btn-ghost btn-sm font-bold gap-2 hover:bg-primary/10 hover:text-primary transition-all text-sm h-10 px-6 rounded-xl border border-transparent hover:border-primary/20"
                        >
                          View Report <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : activeTab === 'IN_PROGRESS' ? (
                        <div className="flex items-center gap-2">
                          {ticket.status === 'IN_PROGRESS' && ticket.assigneeId === currentUserId && (
                            <button
                              className="btn btn-ghost btn-sm font-bold gap-2 hover:bg-info/10 hover:text-info transition-all text-xs h-9 px-4 rounded-xl border border-transparent hover:border-info/20"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await advanceTaskStatus(ticket.id, 'REVIEW' as any)
                                    router.refresh()
                                  } catch (err) {
                                    console.error(err)
                                  }
                                })
                              }}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Submit Review
                            </button>
                          )}
                          {ticket.status === 'REVIEW' && ticket.reporterId === currentUserId && (
                            <button
                              className="btn btn-success btn-sm font-bold gap-2 shadow-lg shadow-success/20 h-9 px-4 rounded-xl text-xs hover:scale-[1.05] active:scale-95 transition-all text-white"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await advanceTaskStatus(ticket.id, 'COMPLETED' as any)
                                    router.refresh()
                                  } catch (err) {
                                    console.error(err)
                                  }
                                })
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Complete
                            </button>
                          )}
                          <Link
                            href={`/tasks/${ticket.id}`}
                            className="btn btn-ghost btn-sm font-bold gap-2 hover:bg-warning/10 hover:text-warning transition-all text-xs h-9 px-4 rounded-xl border border-transparent hover:border-warning/20"
                          >
                            Track <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      ) : canManage && activeTab === 'NEW' ? (
                        <button
                          className="btn btn-primary btn-sm font-bold gap-2 shadow-lg shadow-primary/20 h-10 px-6 rounded-xl text-sm"
                          onClick={() => {
                            setSelectedTicket(ticket)
                            const modal = document.getElementById('process_modal') as any
                            if (modal) modal.showModal()
                          }}
                        >
                          Manage <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <Link
                          href={`/tasks/${ticket.id}`}
                          className="btn btn-ghost btn-sm font-bold gap-2 hover:bg-primary/10 hover:text-primary transition-all text-sm h-10 px-6 rounded-xl border border-transparent hover:border-primary/20"
                        >
                          View Details <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <dialog id="process_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box p-0 overflow-hidden max-w-lg bg-base-100 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-base-content/5 flex flex-col max-h-[96vh]">
          {/* Compressed Professional Header */}
          <div className="bg-primary p-4 md:p-5 text-primary-content relative overflow-hidden flex flex-col items-center text-center shrink-0">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />

            <button
              type="button"
              onClick={() => {
                const modal = document.getElementById('process_modal') as any
                if (modal) modal.close()
              }}
              className="absolute top-4 right-4 btn btn-circle btn-ghost btn-xs text-primary-content/40 hover:text-primary-content hover:bg-white/10 transition-all"
            >
              <XCircle size={18} />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 md:w-11 md:h-11 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/20 mb-2 shadow-md">
                <Settings2 size={20} />
              </div>
              <h3 className="font-bold text-lg md:text-xl tracking-tight uppercase leading-none">Manage Brief</h3>
              <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] opacity-60 mt-1">Executive Assignment Portal</p>
            </div>

            {selectedTicket && (
              <div className="mt-3 w-full max-w-sm p-2 bg-white/5 rounded-xl backdrop-blur-md border border-white/10 text-center animate-in slide-in-from-top-2 duration-500">
                <p className="text-[7px] font-bold uppercase tracking-[0.2em] opacity-40 mb-0.5">Target Directive</p>
                <p className="font-bold text-xs leading-tight uppercase tracking-tight truncate px-2">{selectedTicket.title}</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-base-100 p-4 md:p-6 space-y-4 md:space-y-6 flex flex-col items-center premium-scrollbar">
            {/* Context Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <div className="p-4 rounded-2xl bg-base-200/50 border border-base-content/5 text-center group transition-colors">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-base-content/30 block mb-1.5">Department</span>
                <span className="font-bold text-xs uppercase text-primary tracking-tight">
                  {departments.find(d => d.id === Number(assignment.departmentId))?.name || 'Unassigned'}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-base-200/50 border border-base-content/5 text-center group transition-colors">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-base-content/30 block mb-1.5">Project</span>
                <span className="font-bold text-xs text-base-content/80 uppercase tracking-tight block truncate">
                  {selectedTicket?.project?.title || 'Standalone'}
                </span>
              </div>
            </div>

            {/* Assignment Section */}
            <div className="space-y-3 w-full text-center">
              <div className="flex flex-col items-center gap-1.5 pt-2">
                <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-base-content/40">Assignment Parameters</h4>
                <div className="h-0.5 w-6 bg-primary/20 rounded-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-base-content/30 block">Assignee</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/20 group-focus-within:text-primary transition-colors" />
                    <select
                      className="select select-md w-full pl-10 rounded-xl font-bold bg-base-content/5 border-none focus:ring-1 ring-primary/20 transition-all text-xs appearance-none"
                      value={assignment.assigneeId}
                      onChange={(e) => setAssignment(prev => ({ ...prev, assigneeId: e.target.value }))}
                    >
                      <option value="">Select Personnel...</option>
                      {users
                        .filter(u => u.departmentId === Number(assignment.departmentId))
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-base-content/30 block">Temporal Deadline</label>
                  <div className="relative group">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/20 group-focus-within:text-primary transition-colors" />
                    <input
                      type="datetime-local"
                      className="input input-md w-full pl-10 rounded-xl font-bold bg-base-content/5 border-none focus:ring-1 ring-primary/20 transition-all text-xs text-center"
                      value={assignment.dueAt}
                      onChange={(e) => setAssignment(prev => ({ ...prev, dueAt: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SLA Selection */}
            {!assignment.dueAt && (
              <div className="space-y-4 w-full text-center py-1">
                <div className="flex flex-col items-center gap-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/40">Response Protocol</h4>
                  {selectedTicket?.project?.defaultSlaId && (
                    <span className="text-[7px] font-bold uppercase px-2 py-0.5 bg-primary/20 text-primary rounded-full tracking-widest">Inherited Default</span>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {slas.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAssignment(prev => ({ ...prev, slaId: s.id.toString() }))}
                      className={cn(
                        "px-4 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all",
                        Number(assignment.slaId) === s.id
                          ? "bg-primary border-primary text-white shadow-lg"
                          : "bg-base-200/50 border-transparent text-base-content/40 hover:bg-base-200"
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-3 w-full text-center">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/40">Operational Directives</h4>
              <textarea
                className="textarea w-full h-24 rounded-2xl font-bold bg-base-content/5 border-none focus:ring-1 ring-primary/20 transition-all resize-none text-xs p-4 text-center placeholder:text-base-content/10"
                placeholder="Codify instructions here..."
                value={assignment.description}
                onChange={(e) => setAssignment(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          {/* Compact Action Footer */}
          <div className="p-4 md:p-5 bg-base-200/20 border-t border-base-content/5 flex flex-col items-center gap-3 md:gap-4 shrink-0">
            <div className="flex items-center justify-center gap-6 w-full">
              {(selectedTicket?.reporterId === currentUserId || userRole === 'ADMIN') && (
                <button
                  type="button"
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-error opacity-40 hover:opacity-100 transition-all"
                  disabled={isPending}
                  onClick={handleDismiss}
                >
                  Dismiss
                </button>
              )}

              {(selectedTicket?.reporterId === currentUserId || userRole === 'ADMIN') && (
                <div className="h-1 w-1 rounded-full bg-base-content/10" />
              )}

              <button
                type="button"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/40 hover:text-base-content transition-all"
                onClick={() => {
                  const modal = document.getElementById('process_modal') as any
                  if (modal) modal.close()
                }}
              >
                Cancel
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary w-full max-w-xs h-12 rounded-xl font-bold uppercase text-[11px] tracking-wider shadow-ruby-soft transition-all hover:brightness-110 active:scale-[0.98]"
              disabled={isPending || !assignment.departmentId || (!assignment.slaId && !assignment.dueAt)}
              onClick={handleProcess}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Deploy Assignment</span>
                </div>
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop backdrop-blur-md bg-black/40">
          <button className="cursor-default">close</button>
        </form>
      </dialog>
    </div>
  )
}
