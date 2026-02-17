'use client'

import React, { useState, useEffect } from 'react'
import { addHours, format } from 'date-fns'
import { createTask } from '@/app/actions/taskActions'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, Users, Tag, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

type Department = { id: number; name: string }
type Sla = { id: number; name: string; durationHrs: number; tier: string }
type User = { id: number; name: string | null; email: string }

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
  const router = useRouter()
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header Info */}
      <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Briefcase className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-black tracking-tight text-primary uppercase">Initialize Task</h3>
          <p className="text-xs font-semibold text-base-content/50 uppercase tracking-widest">Department-First Routing</p>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 ml-1">Task Nomenclature</label>
        <div className="relative group">
          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
          <input
            required
            type="text"
            placeholder="What needs to be done?"
            className="input input-lg w-full pl-12 bg-base-200/50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-base-100 transition-all font-bold text-lg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 ml-1">Context & Brief</label>
        <textarea
          className="textarea w-full h-32 bg-base-200/50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-base-100 transition-all font-medium text-base p-4"
          placeholder="Provide detailed instructions..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Project Picker */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 ml-1">Parent Project / Client</label>
          <div className="relative group">
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
            <select
              className="select select-lg w-full pl-12 bg-base-200/50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-base-100 transition-all font-bold"
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
            >
              <option value="">No Project Assigned</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>

        {/* Department Picker */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 ml-1">Target Department</label>
          <div className="relative group">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
            <select
              required
              className="select select-lg w-full pl-12 bg-base-200/50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-base-100 transition-all font-bold"
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
      <div className="space-y-4">
        <div className="flex items-center justify-between ml-1">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40">SLA Assignment</label>
          <label className="label cursor-pointer gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">SLA Override</span>
            <input
              type="checkbox"
              className="checkbox checkbox-xs checkbox-primary"
              checked={isSlaOverride}
              onChange={(e) => {
                setIsSlaOverride(e.target.checked)
                if (!e.target.checked) {
                  // Re-apply project default if override disabled
                  const project = projects.find(p => p.id === projectId)
                  if (project?.defaultSlaId) setSelectedSlaId(project.defaultSlaId)
                  else setSelectedSlaId('')
                }
              }}
            />
          </label>
        </div>

        {(isSlaOverride || !projectId) && (
          <div className="relative group animate-in slide-in-from-top-2">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
            <select
              required={!isCustomDueDate}
              className="select select-lg w-full pl-12 bg-base-200/50 border-none focus:ring-2 focus:ring-primary/20 focus:bg-base-100 transition-all font-bold"
              value={selectedSlaId}
              onChange={(e) => setSelectedSlaId(Number(e.target.value))}
            >
              <option value="" disabled>Select Manual SLA</option>
              {slas.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationHrs}h)</option>)}
            </select>
          </div>
        )}

        {projectId && !isSlaOverride && (
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">Inheriting Project SLA: {slas.find(s => s.id === selectedSlaId)?.name || 'Fetching...'}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Automatic Logic Active</span>
          </div>
        )}
      </div>

      {/* Due Date Section */}
      <div className="p-6 bg-base-200/30 rounded-3xl border border-base-content/5 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-base-content/60">SLA Timeline</span>
          </div>
          <label className="label cursor-pointer gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Manual Override</span>
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-xs"
              checked={isCustomDueDate}
              onChange={(e) => setIsCustomDueDate(e.target.checked)}
            />
          </label>
        </div>

        {isCustomDueDate ? (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <input
              type="datetime-local"
              className="input input-lg w-full bg-base-100 border-2 border-primary/20 focus:border-primary transition-all font-bold text-center"
              value={dueDate ? format(dueDate, "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => setDueDate(new Date(e.target.value))}
            />
          </div>
        ) : (
          dueDate && (
            <div className="text-center py-4 px-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-primary/10 shadow-sm animate-in slide-in-from-top-4 duration-500">
              <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 mb-1">Estimated Completion</span>
              <span className="text-2xl font-black tracking-tight text-base-content">{format(dueDate, 'PPP p')}</span>
            </div>
          )
        )}
      </div>

      {/* Watchers */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 ml-1">
          <Users className="w-4 h-4 text-base-content/30" />
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40">Watchers List</label>
        </div>
        <div className="flex flex-wrap gap-2">
          {users.slice(0, 10).map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                setWatcherIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])
              }}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all border-2",
                watcherIds.includes(u.id)
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105"
                  : "bg-base-200/50 border-transparent text-base-content/60 hover:bg-base-300"
              )}
            >
              {u.name || u.email.split('@')[0]}
            </button>
          ))}
        </div>
        <p className="text-[9px] font-bold text-base-content/30 uppercase tracking-widest pl-1">Observers will receive priority notifications for this task.</p>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6">
        <button
          type="button"
          className="text-xs font-black uppercase tracking-widest text-base-content/40 hover:text-base-content transition-colors px-6"
          onClick={() => router.back()}
        >
          Discard
        </button>
        <button
          type="submit"
          className={cn(
            "btn btn-primary btn-lg px-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/40 transition-all hover:scale-[1.02] active:scale-95",
            loading && "loading"
          )}
          disabled={loading}
        >
          {loading ? 'Initializing...' : 'Deploy Task'}
        </button>
      </div>
    </form>
  )
}
