'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { processTicket, dismissTicket, advanceTaskStatus } from '@/app/actions/taskActions'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Ticket, Settings2, CheckCircle2, Inbox as InboxIcon, Clock, CheckCircle, ListTodo, XCircle, FolderGit2, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ColumnType = 'NEW' | 'ONGOING' | 'COMPLETED'

export default function TicketTable({ initialTickets, departments, slas, users, currentUserId, currentUserDepartmentId, userRole, userDept }: {
  initialTickets: any[],
  departments: any[],
  slas: any[],
  users: any[],
  currentUserId: number,
  currentUserDepartmentId?: number,
  userRole: string,
  userDept: string
}) {
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const router = useRouter()

  const [assignment, setAssignment] = useState({
    departmentId: '',
    slaId: '',
    assigneeId: '',
    description: '',
    dueAt: ''
  })

  const isCS = userDept === 'CLIENT_SERVICE' || userDept === 'CLIENT SERVICE'
  const isBD = userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT'
  const isManagerRole = userRole === 'MANAGER'
  const canManage = !isCS && !isBD && (isManagerRole || userRole === 'ADMIN' || userRole === 'CEO' || userRole === 'HR')
  const isInitiatorView = isCS || isBD

  const selectedDepartmentId = assignment.departmentId ? Number(assignment.departmentId) : undefined
  const managerDepartmentId = currentUserDepartmentId

  const assignableUsers = useMemo(() => {
    const effectiveDepartmentId = isManagerRole && managerDepartmentId ? managerDepartmentId : selectedDepartmentId
    if (!effectiveDepartmentId) return []
    return users.filter((user: any) => user.departmentId === effectiveDepartmentId)
  }, [users, selectedDepartmentId, isManagerRole, managerDepartmentId])

  // Auto-fill assignment data when ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      const fallbackDepartmentId = isManagerRole && managerDepartmentId ? managerDepartmentId : undefined
      const resolvedDepartmentId = selectedTicket.departmentId || fallbackDepartmentId
      setAssignment(prev => ({
        ...prev,
        departmentId: resolvedDepartmentId?.toString() || '',
        slaId: (selectedTicket.project?.defaultSlaId || selectedTicket.slaId || '').toString(),
        assigneeId: selectedTicket.assignee?.id?.toString() || '',
        dueAt: selectedTicket.dueAt ? format(new Date(selectedTicket.dueAt), "yyyy-MM-dd'T'HH:mm") : ''
      }))
    }
  }, [selectedTicket, isManagerRole, managerDepartmentId])

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return initialTickets.filter(ticket => {
      if (!normalizedSearch) return true

      return (
        ticket.title.toLowerCase().includes(normalizedSearch) ||
        ticket.project?.title?.toLowerCase().includes(normalizedSearch) ||
        ticket.reporter?.name?.toLowerCase().includes(normalizedSearch) ||
        `ref-${ticket.id.toString().padStart(4, '0')}`.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [initialTickets, search])

  const columns = useMemo(() => {
    const columnMap: Record<ColumnType, any[]> = {
      NEW: [],
      ONGOING: [],
      COMPLETED: []
    }

    filteredTickets.forEach(ticket => {
      if (ticket.status === 'PENDING' || ticket.status === 'RECEIVED') {
        columnMap.NEW.push(ticket)
      } else if (['IN_PROGRESS', 'REVIEW', 'AWAITING_INFO'].includes(ticket.status)) {
        columnMap.ONGOING.push(ticket)
      } else if (ticket.status === 'COMPLETED' || ticket.status === 'DISMISSED') {
        columnMap.COMPLETED.push(ticket)
      }
    })

    return columnMap
  }, [filteredTickets])

  async function handleProcess() {
    if (!selectedTicket || !assignment.departmentId || !assignment.assigneeId || (!assignment.slaId && !assignment.dueAt)) return

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
    { id: 'NEW' as ColumnType, label: 'New', icon: InboxIcon, color: 'text-primary', hint: 'Pending intake' },
    { id: 'ONGOING' as ColumnType, label: 'Ongoing', icon: Clock, color: 'text-warning', hint: 'Live execution' },
    { id: 'COMPLETED' as ColumnType, label: 'Completed', icon: CheckCircle, color: 'text-success', hint: 'Closed briefs' },
  ]

  const getStatusTone = (status: string) => {
    if (status === 'PENDING') return 'bg-base-200/70 text-base-content/70'
    if (status === 'RECEIVED') return 'bg-info/10 text-info'
    if (status === 'IN_PROGRESS') return 'bg-warning/10 text-warning'
    if (status === 'REVIEW') return 'bg-primary/10 text-primary'
    if (status === 'AWAITING_INFO') return 'bg-error/10 text-error'
    if (status === 'DISMISSED') return 'bg-base-300/60 text-base-content/50'
    return 'bg-success/10 text-success'
  }

  return (
    <div className="flex flex-col h-full bg-base-100">
      <div className="flex flex-col gap-3 border-b border-base-200 px-4 md:px-6 py-4 bg-base-100/85 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base md:text-lg font-black tracking-tight text-base-content uppercase">Brief Pipeline</h2>
            <p className="text-xs md:text-sm text-base-content/70 font-medium">
              {isInitiatorView ? 'Track the briefs you initiated from intake to completion.' : 'Triage, route, and monitor briefs across the pipeline.'}
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search briefs..."
              className="input input-bordered w-full rounded-2xl bg-base-100 pl-4 pr-4 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {tabs.map(tab => (
            <div key={tab.id} className="rounded-xl border border-base-200 bg-base-100 px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-base-200/60', tab.color)}>
                    <tab.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-base-content">{tab.label}</div>
                    <div className="text-[10px] text-base-content/50 font-bold uppercase tracking-[0.12em]">{tab.hint}</div>
                  </div>
                </div>
                <div className="text-xl font-black tracking-tight text-base-content">{columns[tab.id].length}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 p-4 md:p-6">
        {tabs.map((tab, columnIndex) => (
          <motion.section
            key={tab.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: columnIndex * 0.05 }}
            className="rounded-2xl border border-base-200 bg-base-100/90 shadow-md flex flex-col xl:h-[70vh]"
          >
            <div className="flex items-center justify-between border-b border-base-200 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center bg-base-200/60', tab.color)}>
                  <tab.icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-base-content">{tab.label}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-base-content/40">{columns[tab.id].length} briefs</div>
                </div>
              </div>
            </div>

            <motion.div layout className="flex-1 overflow-y-auto premium-scrollbar p-3 flex flex-col gap-2.5">
              <AnimatePresence mode="popLayout">
                {columns[tab.id].length === 0 ? (
                  <motion.div
                    key={`${tab.id}-empty`}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="flex min-h-[9rem] flex-col items-center justify-center rounded-xl border border-dashed border-base-200 bg-base-200/20 text-center"
                  >
                    <ListTodo className="w-6 h-6 text-base-content/20 mb-2" />
                    <div className="text-xs font-black uppercase tracking-wider text-base-content/40">No briefs</div>
                  </motion.div>
                ) : (
                  columns[tab.id].map((ticket, ticketIndex) => {
                    const isReviewerAction = ticket.status === 'REVIEW' && ticket.reporterId === currentUserId
                    const isAssigneeAction = ticket.status === 'IN_PROGRESS' && ticket.assignee?.id === currentUserId
                    const canDismiss = tab.id === 'NEW' && ticket.reporterId === currentUserId

                    return (
                      <motion.article
                        key={ticket.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: ticketIndex * 0.03 }}
                        className="rounded-xl border border-base-200 bg-base-100 p-3 shadow-sm hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-base-200/60', tab.color)}>
                                <Ticket className="w-3.5 h-3.5" />
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-base-content/30">
                                REF-{ticket.id.toString().padStart(4, '0')}
                              </div>
                            </div>
                            <Link href={`/tasks/${ticket.id}`} className="mt-2 block text-xs md:text-sm font-bold tracking-tight text-base-content hover:text-primary transition-colors line-clamp-2">
                              {ticket.title}
                            </Link>
                          </div>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0', getStatusTone(ticket.status))}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-base-content/70 truncate">{ticket.reporter?.name || 'Unknown'}</span>
                          <span className="text-base-content/25">/</span>
                          <span className="font-bold text-base-content/70 truncate">{ticket.assignee?.name || 'Unassigned'}</span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-base-content/45 font-bold uppercase tracking-[0.12em]">
                          <span>{format(new Date(ticket.createdAt), 'MMM dd')}</span>
                          <span>{ticket.dueAt ? format(new Date(ticket.dueAt), 'MMM dd') : 'No due'}</span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {canManage && tab.id === 'NEW' ? (
                            <button
                              className="btn btn-primary btn-xs rounded-lg font-bold"
                              onClick={() => {
                                setSelectedTicket(ticket)
                                const modal = document.getElementById('process_modal') as any
                                if (modal) modal.showModal()
                              }}
                            >
                              Manage <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : null}

                          {isAssigneeAction ? (
                            <button
                              className="btn btn-ghost btn-xs rounded-lg border border-info/20 hover:bg-info/10 hover:text-info font-bold"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await advanceTaskStatus(ticket.id, 'REVIEW' as any)
                                    router.refresh()
                                  } catch (error) {
                                    console.error(error)
                                  }
                                })
                              }}
                            >
                              Submit Review
                            </button>
                          ) : null}

                          {isReviewerAction ? (
                            <button
                              className="btn btn-success btn-xs rounded-lg text-white font-bold"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await advanceTaskStatus(ticket.id, 'COMPLETED' as any)
                                    router.refresh()
                                  } catch (error) {
                                    console.error(error)
                                  }
                                })
                              }}
                            >
                              Complete
                            </button>
                          ) : null}

                          {canDismiss ? (
                            <button
                              className="btn btn-ghost btn-xs rounded-lg border border-error/20 hover:bg-error/10 hover:text-error font-bold"
                              disabled={isPending}
                              onClick={() => {
                                setSelectedTicket(ticket)
                                startTransition(async () => {
                                  try {
                                    await dismissTicket(ticket.id)
                                    router.refresh()
                                  } catch (error) {
                                    console.error(error)
                                  }
                                })
                              }}
                            >
                              Dismiss
                            </button>
                          ) : null}

                          <Link href={`/tasks/${ticket.id}`} className="btn btn-ghost btn-xs rounded-lg border border-base-200 hover:border-primary/20 hover:bg-primary/10 font-bold">
                            {isInitiatorView && tab.id === 'NEW' ? 'View Details' : 'Track'}
                          </Link>
                        </div>
                      </motion.article>
                    )
                  })
                )}
              </AnimatePresence>
            </motion.div>
          </motion.section>
        ))}
      </div>

      <dialog id="process_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box p-0 overflow-hidden max-w-lg bg-base-100 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-base-content/20 flex flex-col max-h-[96vh]">
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
              <p className="text-sm md:text-xs font-bold uppercase tracking-[0.2em] opacity-60 mt-1">Executive Assignment Portal</p>
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
              <div className="p-4 rounded-2xl bg-base-200/50 border border-base-content/20 text-center group transition-colors">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/30 block mb-1.5">Department</span>
                <span className="font-bold text-xs uppercase text-primary tracking-tight">
                  {departments.find(d => d.id === Number(assignment.departmentId))?.name || 'Unassigned'}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-base-200/50 border border-base-content/20 text-center group transition-colors">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/30 block mb-1.5">Project</span>
                <span className="font-bold text-xs text-base-content/80 uppercase tracking-tight block truncate">
                  {selectedTicket?.project?.title || 'Standalone'}
                </span>
              </div>
            </div>

            {/* Assignment Section */}
            <div className="space-y-3 w-full text-center">
              <div className="flex flex-col items-center gap-1.5 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/70">Assignment Parameters</h4>
                <div className="h-0.5 w-6 bg-primary/20 rounded-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-base-content/30 block">Assignee</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/70 group-focus-within:text-primary transition-colors" />
                    <select
                      className="select select-md w-full pl-10 rounded-xl font-bold bg-base-content/5 border-none focus:ring-1 ring-primary/20 transition-all text-xs appearance-none"
                      value={assignment.assigneeId}
                      onChange={(e) => setAssignment(prev => ({ ...prev, assigneeId: e.target.value }))}
                    >
                      <option value="">Select Personnel...</option>
                      {assignableUsers.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-base-content/30 block">Temporal Deadline</label>
                  <div className="relative group">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/70 group-focus-within:text-primary transition-colors" />
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
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-base-content/70">Response Protocol</h4>
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
                        "px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all",
                        Number(assignment.slaId) === s.id
                          ? "bg-primary border-primary text-white shadow-lg"
                          : "bg-base-200/50 border-transparent text-base-content/70 hover:bg-base-200"
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
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-base-content/70">Operational Directives</h4>
              <textarea
                className="textarea w-full h-24 rounded-2xl font-bold bg-base-content/5 border-none focus:ring-1 ring-primary/20 transition-all resize-none text-xs p-4 text-center placeholder:text-base-content/40"
                placeholder="Codify instructions here..."
                value={assignment.description}
                onChange={(e) => setAssignment(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          {/* Compact Action Footer */}
          <div className="p-4 md:p-5 bg-base-200/20 border-t border-base-content/20 flex flex-col items-center gap-3 md:gap-4 shrink-0">
            <div className="flex items-center justify-center gap-6 w-full">
              {(selectedTicket?.reporterId === currentUserId || userRole === 'ADMIN') && (
                <button
                  type="button"
                  className="text-sm font-bold uppercase tracking-[0.2em] text-error opacity-40 hover:opacity-100 transition-all"
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
                className="text-sm font-bold uppercase tracking-[0.2em] text-base-content/70 hover:text-base-content transition-all"
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
              className="btn btn-primary w-full max-w-xs h-12 rounded-xl font-bold uppercase text-sm tracking-wider shadow-ruby-soft transition-all hover:brightness-110 active:scale-[0.98]"
                      disabled={isPending || !assignment.departmentId || !assignment.assigneeId || (!assignment.slaId && !assignment.dueAt)}
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
