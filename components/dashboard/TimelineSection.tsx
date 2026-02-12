import React from 'react'
import prisma from '@/lib/db'
import Link from 'next/link'
import { format, startOfWeek, eachDayOfInterval, isSameDay, isToday as isDateToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  ArrowRight
} from 'lucide-react'

type TaskWithSla = {
  id: number
  title: string
  status: string
  createdAt: Date
  dueAt?: Date | null
  sla: { name: string; durationHrs: number; tier: string }
}

async function fetchTasks(userRole: string, userId: number, filterDate?: Date): Promise<TaskWithSla[]> {
  const where: any = {}
  const isPrivileged = ['CLIENT_SERVICE', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)
  
  if (!isPrivileged) {
    where.OR = [
      { assigneeId: userId },
      { assignee: { department: { headId: userId } } }
    ]
  }

  if (filterDate) {
    const start = new Date(filterDate)
    start.setDate(1)
    start.setHours(0,0,0,0)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 2)
    where.dueAt = { gte: start, lt: end }
  }

  const tasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      dueAt: true,
      sla: {
        select: {
          name: true,
          durationHrs: true,
          tier: true,
        }
      }
    },
    orderBy: { dueAt: 'asc' },
  })
  return tasks as unknown as TaskWithSla[]
}

function getDueAt(task: TaskWithSla) {
  if (task.dueAt) return task.dueAt
  const created = new Date(task.createdAt)
  return new Date(created.getTime() + task.sla.durationHrs * 60 * 60 * 1000)
}

export default async function TimelineSection({ 
  userRole, 
  userId, 
  viewDate, 
  expandMode,
  searchParams
}: { 
  userRole: string, 
  userId: number, 
  viewDate: Date, 
  expandMode: boolean,
  searchParams: any
}) {
  const tasks = await fetchTasks(userRole, userId, viewDate)
  const start = startOfWeek(viewDate)
  const dayCount = expandMode ? 28 : 14
  const end = new Date(start.getTime() + (dayCount - 1) * 24 * 60 * 60 * 1000)
  const days = eachDayOfInterval({ start, end })

  return (
    <div className="space-y-4">
      <div className="bg-base-100 p-4 rounded-t-2xl border-b border-base-200 flex items-center justify-between">
         <div className="flex items-center gap-2">
           <CalendarIcon className="w-4 h-4 text-primary" />
           <span className="text-xs font-black uppercase tracking-widest leading-none">Operational Timeline</span>
         </div>
         <Link 
           href={`/?${new URLSearchParams({...searchParams, view: expandMode ? 'standard' : 'full'}).toString()}`}
           className="btn btn-ghost btn-xs gap-2 font-black uppercase text-[10px] tracking-widest text-primary hover:bg-primary/5"
         >
           {expandMode ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
           {expandMode ? 'Minimize' : 'Expand Focus'}
         </Link>
      </div>

      <div className="hidden md:grid grid-cols-7 border-b border-base-200 bg-base-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-4 text-center text-[10px] font-black text-base-content/30 uppercase tracking-[0.4em]">
            {d}
          </div>
        ))}
      </div>
      
      <div className="hidden md:grid grid-cols-7 gap-px bg-base-200 auto-rows-fr rounded-b-2xl overflow-hidden border border-base-200">
        {days.map((day) => {
          const dayTasks = tasks.filter((t) => isSameDay(getDueAt(t), day))
          const today = isDateToday(day)
          return (
            <div key={String(day)} className={cn("min-h-[120px] bg-base-100 p-3 transition-all hover:bg-base-200/20 group relative", today && "bg-primary/[0.02]")}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-xs font-black transition-all", today ? "text-primary scale-110" : "text-base-content/20 group-hover:text-base-content/60")}>
                  {format(day, 'd')}
                </span>
                {today && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
              </div>
              <div className="space-y-1 max-h-[100px] overflow-y-auto no-scrollbar">
                {dayTasks.map((t) => {
                  const isOverdue = t.status !== 'COMPLETED' && new Date() > getDueAt(t)
                  return (
                    <Link key={t.id} href={`/tasks/${t.id}`} className={cn("flex flex-col gap-0.5 p-1.5 rounded-md border text-[8px] font-black uppercase tracking-tight transition-all hover:translate-x-1", isOverdue ? "bg-error/5 text-error border-error/10" : t.status === 'COMPLETED' ? "bg-success/5 text-success border-success/10" : "bg-primary/5 text-primary border-primary/10 shadow-sm")}>
                      <span className="truncate">{t.title}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile Timeline List */}
      <div className="md:hidden divide-y divide-base-200 bg-base-100 rounded-2xl border border-base-200 overflow-hidden">
         {days.filter(d => tasks.some(t => isSameDay(getDueAt(t), d))).map(day => (
           <div key={String(day)} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{format(day, 'EEEE, MMM d')}</span>
                 {isDateToday(day) && <span className="badge badge-primary badge-xs font-black uppercase">Today</span>}
              </div>
              <div className="space-y-2">
                 {tasks.filter(t => isSameDay(getDueAt(t), day)).map(t => (
                   <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center justify-between p-3 bg-base-200/30 rounded-xl border border-transparent">
                      <div className="flex flex-col gap-1">
                         <span className="text-xs font-bold text-base-content">{t.title}</span>
                         <span className="text-[9px] font-black uppercase opacity-40">{t.status.replace('_', ' ')}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-base-content/20" />
                   </Link>
                 ))}
              </div>
           </div>
         ))}
      </div>
    </div>
  )
}

export function TimelineSkeleton() {
  return (
    <div className="w-full h-96 bg-base-200 border border-base-200 rounded-2xl animate-pulse" />
  )
}
