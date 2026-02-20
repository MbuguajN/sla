'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { processTicket, dismissTicket, advanceTaskStatus } from '@/app/actions/taskActions'
import { ArrowRight, Ticket, User, Calendar, Settings2, Loader2, CheckCircle2, Inbox as InboxIcon, Clock, CheckCircle, ListTodo, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type TabType = 'NEW' | 'IN_PROGRESS' | 'DONE'

export default function TicketTable({ initialTickets, departments, slas, users, currentUserId }: {
  initialTickets: any[],
  departments: any[],
  slas: any[],
  users: any[],
  currentUserId: number
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
    { id: 'NEW' as TabType, label: 'New Briefs', icon: InboxIcon, color: 'text-primary' },
    { id: 'IN_PROGRESS' as TabType, label: 'In Pipeline', icon: Clock, color: 'text-warning' },
    { id: 'DONE' as TabType, label: 'Completed Briefs', icon: CheckCircle, color: 'text-success' },
  ]

  return (
    <div className="flex flex-col h-full">
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

      <div className="overflow-x-auto">
        <table className="table table-fixed h-full w-full">
          <thead>
            <tr className="bg-base-200/20 border-b border-base-200/50">
              <th className="py-4 pl-6 w-[35%]">Brief / Reference</th>
              <th className="py-4 w-[18%]">Origin</th>
              <th className="py-4 w-[15%]">Received</th>
              <th className="py-4 w-[10%]">Status</th>
              <th className="py-4 text-right pr-6 w-[22%]"></th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-32 border-none">
                  <div className="flex flex-col items-center gap-4 opacity-10">
                    <ListTodo className="w-20 h-20 stroke-[1]" />
                    <span className="text-sm font-bold uppercase tracking-[0.4em]">Grid Silent</span>
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
                  <td className="py-4 border-b border-base-100">
                    <div className={cn(
                      "badge badge-sm font-bold text-[10px] uppercase tracking-wide h-6 px-4 border-none shadow-sm",
                      ticket.status === 'PENDING' ? "bg-base-200/50 text-base-content/40" :
                        ticket.status === 'IN_PROGRESS' ? "bg-warning/10 text-warning" :
                          ticket.status === 'REVIEW' ? "bg-info/10 text-info" :
                            ticket.status === 'COMPLETED' ? "bg-success/10 text-success" : "bg-error/10 text-error"
                    )}>
                      {ticket.status.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="py-4 text-right pr-6 border-b border-base-100">
                    <div className="flex items-center justify-end gap-1.5">
                      {activeTab === 'NEW' && (
                        <button
                          className="btn btn-ghost btn-sm text-error/40 hover:text-error hover:bg-error/5 font-bold gap-2 text-xs"
                          onClick={() => {
                            setSelectedTicket(ticket)
                            const modal = document.getElementById('process_modal') as any
                            if (modal) modal.showModal()
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                          <span className="hidden xl:inline">Dismiss</span>
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
                          {ticket.status === 'IN_PROGRESS' && (
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
                              className="btn btn-ghost btn-sm font-bold gap-2 hover:bg-success/10 hover:text-success transition-all text-xs h-9 px-4 rounded-xl border border-transparent hover:border-success/20"
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
                      ) : (
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
                <h3 className="font-bold text-2xl tracking-tight">Brief Assignment</h3>
              </div>
              {selectedTicket && (
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                  <p className="text-xs font-bold uppercase opacity-60 tracking-wider mb-2">Target Brief</p>
                  <p className="font-bold text-lg leading-tight tracking-tight">{selectedTicket.title}</p>
                </div>
              )}
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            <div className="p-10 space-y-8">
              {/* Header Context Row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-base-200/30 rounded-2xl border border-base-200/50">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-40">Assigned Department</span>
                  <span className="font-bold text-sm text-primary uppercase">{departments.find(d => d.id === Number(assignment.departmentId))?.name || 'Unassigned'}</span>
                </div>
                <div className="h-8 w-px bg-base-300 hidden md:block" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-40">Project Context</span>
                  <span className="font-bold text-sm text-base-content/80 uppercase">{selectedTicket?.project?.title || 'Standalone Brief'}</span>
                </div>
                {selectedTicket?.project?.defaultSlaId && (
                  <div className="badge badge-primary badge-outline gap-1 text-[9px] font-bold uppercase py-2 h-auto ml-auto">
                    <Clock className="w-3 h-3" /> SLA Inherited
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-xs font-bold uppercase tracking-wider opacity-50">Personnel Allocation</span>
                  </label>
                  <select
                    className="select select-bordered w-full font-bold h-12 bg-base-200/50 border-base-300 transition-all focus:border-primary text-sm"
                    value={assignment.assigneeId}
                    onChange={(e) => setAssignment(prev => ({ ...prev, assigneeId: e.target.value }))}
                  >
                    <option value="">(Select Agent...)</option>
                    {users
                      .filter(u => u.departmentId === Number(assignment.departmentId))
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} [{u.role}]
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-xs font-bold uppercase tracking-wider opacity-50 text-warning">Manual Operational Deadline</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full font-bold h-12 bg-base-200/50 border-base-300 transition-all focus:border-warning"
                    value={assignment.dueAt}
                    onChange={(e) => setAssignment(prev => ({ ...prev, dueAt: e.target.value }))}
                  />
                </div>
              </div>

              {!assignment.dueAt && (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-xs font-bold uppercase tracking-wider opacity-50">Strategic SLA Tier</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slas.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setAssignment(prev => ({ ...prev, slaId: s.id.toString() }))}
                        className={cn(
                          "px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all text-center",
                          Number(assignment.slaId) === s.id
                            ? "bg-primary border-primary text-primary-content shadow-lg shadow-primary/20 scale-[1.02]"
                            : "bg-base-200/50 border-base-300 text-base-content/40 hover:bg-base-200"
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-xs font-bold uppercase tracking-wider opacity-50">Brief Context / Description</span>
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
                  className="btn btn-primary btn-block h-14 min-h-14 shadow-2xl shadow-primary/30 gap-3 font-bold uppercase tracking-wider text-sm"
                  disabled={isPending || !assignment.departmentId || (!assignment.slaId && !assignment.dueAt)}
                  onClick={handleProcess}
                >
                  {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                  {isPending ? 'Processing Assignment...' : 'Finalize Brief Assignment'}
                </button>

                <button
                  className="btn btn-error btn-outline btn-block h-12 gap-3 font-bold uppercase tracking-wider text-xs"
                  disabled={isPending}
                  onClick={handleDismiss}
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Dismiss Directive
                </button>
                <button
                  className="btn btn-ghost btn-sm font-bold uppercase tracking-widest text-xs opacity-40 hover:opacity-100"
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
