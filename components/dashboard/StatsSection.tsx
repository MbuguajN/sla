import React from 'react'
import prisma from '@/lib/db'
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

export default async function StatsSection() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  
  const tasksAddedToday = await prisma.task.count({ where: { createdAt: { gte: todayStart } } })
  const allCompletedTasks = await prisma.task.count({ where: { status: 'COMPLETED' } })
  const allTasks = await prisma.task.count()
  const slaSuccessRate = allTasks > 0 ? Math.round((allCompletedTasks / allTasks) * 1000) / 10 : 0
  const activeProjectsCount = await prisma.project.count()
  const overdueTasksCount = await prisma.task.count({
    where: { status: { not: 'COMPLETED' }, dueAt: { lt: new Date() } }
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="p-3 bg-base-100 border border-base-200 rounded-xl shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.15em] opacity-40 mb-1 leading-none">Active Projects</div>
          <div className="text-xl font-black text-primary tracking-tighter leading-none">{activeProjectsCount}</div>
          <div className="text-[8px] font-bold mt-1 text-base-content/40 uppercase tracking-widest">{tasksAddedToday} tasks added</div>
        </div>
        <TrendingUp className="w-5 h-5 text-primary opacity-10 group-hover:opacity-40 transition-all" />
      </div>
      <div className="p-3 bg-base-100 border border-base-200 rounded-xl shadow-sm flex items-center justify-between group hover:border-error/20 transition-all">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.15em] opacity-40 mb-1 leading-none">Overdue SLAs</div>
          <div className="text-2xl font-black text-error tracking-tighter leading-none">{overdueTasksCount}</div>
          <div className="text-[8px] font-bold mt-1 text-base-content/40 uppercase tracking-widest">Immediate action</div>
        </div>
        <AlertTriangle className="w-5 h-5 text-error opacity-10 group-hover:opacity-40 transition-all" />
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
       {[1, 2, 3].map(i => (
         <div key={i} className="h-24 bg-base-200 border border-base-200 rounded-2xl" />
       ))}
    </div>
  )
}
