'use client'

import React, { useState, useEffect } from 'react'
import { addHours, format } from 'date-fns'
import { createTask } from '@/app/actions/taskActions'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, Users, Tag, Briefcase, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type Department = { id: number; name: string }
type Sla = { id: number; name: string; durationHrs: number; tier: string }
type User = { id: number; name: string | null; email: string }

import { useSession } from 'next-auth/react'

export default function TaskForm({
  departments,
  slas,
  users,
  projects
}: {
  departments: Department[],
  slas: Sla[],
  users: User[],
  projects: any[]
}) {
  const { data: session } = useSession()
  const userDept = (session?.user as any)?.departmentName
  const isAuthorized = userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT' ||
    userDept === 'CLIENT_SERVICE' || userDept === 'CLIENT SERVICE'

  const router = useRouter()

  if (session && !isAuthorized) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">Access Restricted</h2>
        <p className="text-base-content/60 max-w-md mx-auto font-medium">
          ACCESS DENIED: Directive initiation is strictly restricted to Business Development and Client Service departments.
        </p>
        <button onClick={() => router.push('/')} className="btn btn-ghost btn-sm font-bold uppercase tracking-widest mt-4">
          Return to Hub
        </button>
      </div>
    )
  }
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState<number | ''>('')
  const [selectedSlaId, setSelectedSlaId] = useState<number | ''>('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [watcherIds, setWatcherIds] = useState<number[]>([])
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [isCustomDueDate, setIsCustomDueDate] = useState(false)
  const [isSlaOverride, setIsSlaOverride] = useState(false)

  // Auto-SLA logic: When project changes, apply its default SLA if not overriding
  useEffect(() => {
    if (projectId && !isSlaOverride) {
      const project = projects.find(p => p.id === projectId)
      if (project?.defaultSlaId) {
        setSelectedSlaId(project.defaultSlaId)
      }
    }
  }, [projectId, isSlaOverride, projects])

  useEffect(() => {
    if (!isCustomDueDate) {
      if (selectedSlaId) {
        const sla = slas.find(s => s.id === selectedSlaId)
        if (sla) {
          const calculated = addHours(new Date(), sla.durationHrs)
          setDueDate(calculated)
        }
      } else {
        setDueDate(null)
      }
    }
  }, [selectedSlaId, slas, isCustomDueDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dueDate || (!isCustomDueDate && !selectedSlaId) || !departmentId) return

    setLoading(true)
    try {
      await createTask({
        title,
        description,
        slaId: selectedSlaId as number,
        departmentId: departmentId as number,
        watcherIds,
        dueAt: dueDate,
        projectId: projectId || undefined
      })
      router.push('/')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 w-full flex flex-col items-center">
      {/* Title Section */}
      <div className="space-y-2 md:space-y-3 w-full text-center">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30 block">Task Nomenclature</label>
        <div className="relative group max-w-xl mx-auto w-full">
          <Tag className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
          <input
            required
            type="text"
            placeholder="What needs to be done?"
            className="input input-lg w-full pl-14 pr-6 bg-base-content/5 border-none rounded-2xl focus:ring-2 ring-primary/20 transition-all font-black text-base md:text-lg text-center placeholder:text-base-content/10 shadow-inner h-12 md:h-14"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2 md:space-y-3 w-full text-center">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30 block">Operational Directives</label>
        <div className="max-w-xl mx-auto w-full">
          <textarea
            className="textarea w-full h-24 md:h-28 bg-base-content/5 border-none rounded-[1.5rem] md:rounded-[2rem] focus:ring-2 ring-primary/20 transition-all font-bold text-sm p-4 md:p-5 text-center placeholder:text-base-content/10 shadow-inner resize-none"
            placeholder="Codify the full brief here..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full">
        {/* Project Picker */}
        <div className="space-y-2 md:space-y-3 text-center">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30 block">Associated Project</label>
          <div className="relative group">
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
            <select
              className="select select-lg w-full pl-12 rounded-2xl font-black bg-base-content/5 border-none focus:ring-2 ring-primary/20 transition-all text-xs md:text-sm text-center appearance-none shadow-inner h-10 md:h-12"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Standalone Instance</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>

        {/* Department Picker */}
        <div className="space-y-2 md:space-y-3 text-center">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30 block">Target Department</label>
          <div className="relative group">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
            <select
              required
              className="select select-lg w-full pl-12 rounded-2xl font-black bg-base-content/5 border-none focus:ring-2 ring-primary/20 transition-all text-xs md:text-sm text-center appearance-none shadow-inner h-10 md:h-12"
              value={departmentId}
              onChange={(e) => setDepartmentId(Number(e.target.value))}
            >
              <option value="" disabled>Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* SLA Section */}
      <div className="space-y-3 md:space-y-4 w-full flex flex-col items-center">
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30">Response Protocol (SLA)</label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="checkbox checkbox-xs border-2 border-primary/30 checked:border-primary"
                checked={isSlaOverride}
                onChange={(e) => {
                  setIsSlaOverride(e.target.checked)
                  if (!e.target.checked) {
                    const project = projects.find(p => p.id === projectId)
                    if (project?.defaultSlaId) setSelectedSlaId(project.defaultSlaId)
                    else setSelectedSlaId('')
                  }
                }}
              />
              <span className="text-[9px] font-black uppercase tracking-widest text-base-content/20 group-hover:text-primary transition-colors">SLA Override</span>
            </label>
          </div>

          {(isSlaOverride || !projectId) && (
            <div className="relative group max-w-md w-full animate-in slide-in-from-top-2">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors font-black" />
              <select
                required={!isCustomDueDate}
                className="select select-lg w-full pl-12 rounded-2xl font-black bg-base-content/5 border-none focus:ring-2 ring-primary/20 transition-all text-sm text-center appearance-none shadow-inner h-12 md:h-14"
                value={selectedSlaId}
                onChange={(e) => setSelectedSlaId(Number(e.target.value))}
              >
                <option value="" disabled>Select Priority Protocol</option>
                {slas.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationHrs}H)</option>)}
              </select>
            </div>
          )}

          {projectId && !isSlaOverride && (
            <div className="py-2.5 px-6 bg-primary/5 rounded-full border border-primary/10 flex items-center justify-center gap-3 max-w-md w-full animate-in zoom-in-95">
              <Clock className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-wider text-primary">Inheriting Project SLA: {slas.find(s => s.id === selectedSlaId)?.name || 'Fetching...'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Due Date Section */}
      <div className="w-full max-w-xl p-4 md:p-6 bg-base-content/[0.03] rounded-[1.5rem] md:rounded-[2rem] border border-base-content/5 space-y-3 md:space-y-4 flex flex-col items-center">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30">Temporal Deadline</span>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="checkbox checkbox-xs border-2 border-primary/30 checked:border-primary"
                checked={isCustomDueDate}
                onChange={(e) => setIsCustomDueDate(e.target.checked)}
              />
              <span className="text-[9px] font-black uppercase tracking-widest text-base-content/20 group-hover:text-primary transition-colors">Manual Override</span>
            </label>
          </div>
        </div>

        {isCustomDueDate ? (
          <div className="w-full animate-in fade-in zoom-in-95 duration-200">
            <input
              type="datetime-local"
              className="input input-md w-full bg-base-100 border-none ring-2 ring-primary/10 focus:ring-primary/30 transition-all font-black text-center rounded-xl h-10"
              value={dueDate ? format(dueDate, "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => setDueDate(new Date(e.target.value))}
            />
          </div>
        ) : (
          dueDate && (
            <div className="text-center py-3 px-8 bg-white dark:bg-slate-900 rounded-[1rem] border border-primary/10 shadow-ruby-soft animate-in slide-in-from-top-4 duration-500">
              <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-primary/40 mb-1 italic">Estimated Completion</span>
              <span className="text-xl font-black tracking-tighter text-base-content uppercase">{format(dueDate, 'PPP p')}</span>
            </div>
          )
        )}
      </div>

      {/* Watchers */}
      <div className="space-y-6 w-full text-center">
        <div className="flex flex-col items-center gap-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30">Operational Observers</h4>
        </div>
        <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
          {users.slice(0, 10).map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                setWatcherIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])
              }}
              className={cn(
                "px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2",
                watcherIds.includes(u.id)
                  ? "bg-primary border-primary text-white shadow-ruby-soft animate-in zoom-in-105"
                  : "bg-base-content/5 border-transparent text-base-content/40 hover:bg-base-content/10"
              )}
            >
              {u.name || u.email.split('@')[0]}
            </button>
          ))}
        </div>
        <p className="text-[8px] font-bold text-base-content/10 uppercase tracking-[0.4em] italic leading-none">Observers monitored via priority notification protocol.</p>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col items-center gap-4 pt-6 w-full max-w-sm">
        <button
          type="submit"
          className={cn(
            "btn btn-primary btn-lg w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.25em] shadow-ruby-massive transition-all hover:scale-[1.03] active:scale-[0.97] border-none",
            loading && "loading"
          )}
          disabled={loading}
        >
          {loading ? 'Initializing Interface...' : (
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5" />
              <span>Deploy Brief</span>
            </div>
          )}
        </button>

        <button
          type="button"
          className="text-[11px] font-black uppercase tracking-[0.3em] text-base-content/30 hover:text-base-content hover:scale-110 transition-all px-8 py-2"
          onClick={() => router.back()}
        >
          Abort Protocol
        </button>
      </div>
    </form>
  )
}
