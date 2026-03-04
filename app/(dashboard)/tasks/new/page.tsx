export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import TaskForm from './TaskForm'
import { Briefcase } from 'lucide-react'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function NewTaskPage() {
  const session = await auth()
  const userDept = (session?.user as any)?.departmentName
  const isBD = userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT'
  const isCS = userDept === 'CLIENT_SERVICE' || userDept === 'CLIENT SERVICE'

  if (!isBD && !isCS) {
    redirect('/')
  }

  const departments = await prisma.department.findMany()
  const slas = await prisma.sla.findMany()
  const users = await prisma.user.findMany()
  const projects = await prisma.project.findMany({
    include: { defaultSla: true }
  })

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center p-6 py-12 lg:py-20 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-primary/[0.03] to-transparent" />
        <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-primary/5 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-[30rem] h-[30rem] bg-secondary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-3xl w-full flex-1 flex flex-col items-center relative z-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
        {/* Card — Modern Glassmorphism */}
        <div className="glass-panel shadow-ruby-massive border border-base-content/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl bg-base-100/60 w-full">
          <div className="p-8 lg:p-12 gap-8 flex flex-col">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner mb-2">
                <Briefcase className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-base-content uppercase italic">Initialize Brief</h1>
                <p className="text-[10px] font-black text-base-content/30 uppercase tracking-[0.2em]">Authorized Executive Initiation</p>
              </div>
            </div>

            <TaskForm
              departments={departments}
              slas={slas}
              users={users}
              projects={projects}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mt-12 opacity-30 group cursor-default">
          <div className="h-px w-12 bg-base-content/40 group-hover:w-24 transition-all duration-700" />
          <p className="text-[9px] font-black uppercase tracking-[0.4em]">Operations Command</p>
        </div>
      </div>
    </div>
  )
}
