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
  users 
}: { 
  departments: Department[], 
  slas: Sla[], 
  users: User[] 
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSlaId, setSelectedSlaId] = useState<number | ''>('')
  const [assigneeId, setAssigneeId] = useState<number | ''>('')
  const [watcherIds, setWatcherIds] = useState<number[]>([])
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [isCustomDueDate, setIsCustomDueDate] = useState(false)

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
    if (!dueDate || (!isCustomDueDate && !selectedSlaId)) return

    setLoading(true)
    try {
      await createTask({
        title,
        description,
        slaId: selectedSlaId as number,
        assigneeId: assigneeId === '' ? undefined : assigneeId as number,
        watcherIds,
        dueAt: dueDate
      })
      router.push('/')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-bold uppercase tracking-widest text-[10px] text-base-content/50">Task Title</span>
        </label>
        <div className="relative">
          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
          <input 
            required
            type="text" 
            placeholder="e.g. Design homepage layout" 
            className="input input-bordered w-full pl-12 focus:border-primary transition-all"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      {/* Description */}
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-bold uppercase tracking-widest text-[10px] text-base-content/50">Description</span>
        </label>
        <textarea 
          className="textarea textarea-bordered h-24 focus:border-primary transition-all" 
          placeholder="Detail the requirements..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Picker (Visual only for now, Task is tied to SLA/Assignee) */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold uppercase tracking-widest text-[10px] text-base-content/50">Target Department</span>
          </label>
          <div className="relative">
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
            <select className="select select-bordered w-full pl-12">
              <option disabled selected>Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* SLA Tier Picker */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold uppercase tracking-widest text-[10px] text-base-content/50">SLA Tier</span>
          </label>
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
            <select 
              required={!isCustomDueDate}
              className="select select-bordered w-full pl-12"
              value={selectedSlaId}
              onChange={(e) => setSelectedSlaId(Number(e.target.value))}
            >
              <option value="" disabled>Select SLA Tier</option>
              {slas.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationHrs}h)</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Auto-Calculation Display & Custom Override */}
      <div className="space-y-4">
        <label className="label cursor-pointer justify-start gap-4">
          <input 
            type="checkbox" 
            className="checkbox checkbox-primary checkbox-sm" 
            checked={isCustomDueDate}
            onChange={(e) => setIsCustomDueDate(e.target.checked)}
          />
          <span className="text-xs font-bold uppercase tracking-widest text-base-content/60">Manual Due Date Override</span>
        </label>

        {isCustomDueDate ? (
          <div className="form-control w-full">
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input 
                type="datetime-local" 
                className="input input-bordered w-full pl-12 focus:border-primary transition-all font-bold"
                value={dueDate ? format(dueDate, "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setDueDate(new Date(e.target.value))}
              />
            </div>
          </div>
        ) : (
          dueDate && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3 text-primary">
                <Calendar className="w-5 h-5" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest">Calculated Due Date</span>
                  <span className="text-sm font-bold">{format(dueDate, 'PPP p')}</span>
                </div>
              </div>
              <div className="badge badge-primary font-bold">AUTO-SET</div>
            </div>
          )
        )}
      </div>

      <div className="divider opacity-50">Assignees & Watchers</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assignee */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold uppercase tracking-widest text-[10px] text-base-content/50">Assignee (Manager)</span>
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
            <select 
              className="select select-bordered w-full pl-12"
              value={assigneeId}
              onChange={(e) => setAssigneeId(Number(e.target.value))}
            >
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
          </div>
        </div>

        {/* Watchers (Simplified Multi-select for now) */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold uppercase tracking-widest text-[10px] text-base-content/50">Add Watchers</span>
          </label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
            <select 
              multiple 
              className="select select-bordered w-full pl-12 h-32"
              value={watcherIds.map(String)}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions).map(opt => Number(opt.value))
                setWatcherIds(values)
              }}
            >
              {users.map(u => <option key={u.id} value={u.id} className="py-1 px-2">{u.name || u.email}</option>)}
            </select>
            <div className="label">
              <span className="label-text-alt text-primary font-bold italic animate-pulse">💡 Use Ctrl (Cmd) + Click to SELECT MULTIPLE watchers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-actions justify-end mt-4">
        <button 
          type="button" 
          className="btn btn-ghost px-8"
          onClick={() => router.back()}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className={cn("btn btn-primary px-10 shadow-lg shadow-primary/20", loading && "loading")}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Initialize Task'}
        </button>
      </div>
    </form>
  )
}
