export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import TaskForm from './TaskForm'
import { Briefcase } from 'lucide-react'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'

function parseNumericParam(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (!rawValue) return undefined

  const parsedValue = Number(rawValue)
  return Number.isNaN(parsedValue) ? undefined : parsedValue
}

export default async function NewTaskPage({
  searchParams
}: {
  searchParams?: { projectId?: string | string[]; subProjectId?: string | string[] }
}) {
  const session = await auth()
  const userDept = (session?.user as any)?.departmentName
  const isBD = userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT'
  const isCS = userDept === 'CLIENT_SERVICE' || userDept === 'CLIENT SERVICE'

  if (!isBD && !isCS) {
    redirect('/')
  }

  const requestedProjectId = parseNumericParam(searchParams?.projectId)
  const requestedSubProjectId = parseNumericParam(searchParams?.subProjectId)

  const [departments, slas, users, projects, subProjects] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.sla.findMany({ orderBy: { durationHrs: 'asc' } }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.project.findMany({
      where: {
        status: { notIn: ['CLOSED', 'COMPLETED'] }
      },
      include: { defaultSla: true },
      orderBy: { title: 'asc' }
    }),
    prisma.subProject.findMany({
      where: {
        status: { notIn: ['CLOSED', 'COMPLETED'] },
        project: { status: { notIn: ['CLOSED', 'COMPLETED'] } }
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: [{ projectId: 'asc' }, { createdAt: 'asc' }]
    })
  ])

  let initialProjectId = requestedProjectId
  let initialSubProjectId = requestedSubProjectId

  if (initialProjectId && !projects.some(project => project.id === initialProjectId)) {
    redirect('/tasks/new')
  }

  if (initialSubProjectId) {
    const initialSubProject = subProjects.find(subProject => subProject.id === initialSubProjectId)
    if (!initialSubProject) {
      redirect('/tasks/new')
    }

    if (initialProjectId && initialSubProject.projectId !== initialProjectId) {
      redirect(`/tasks/new?projectId=${initialSubProject.projectId}&subProjectId=${initialSubProject.id}`)
    }

    initialProjectId = initialSubProject.projectId
    initialSubProjectId = initialSubProject.id
  }

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center p-4 py-8 lg:py-12 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-primary/[0.03] to-transparent" />
        <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-primary/5 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-[30rem] h-[30rem] bg-secondary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-3xl w-full flex-1 flex flex-col items-center relative z-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
        {/* Card — Modern Glassmorphism */}
        <div className="glass-panel shadow-ruby-massive border border-base-content/20 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden backdrop-blur-3xl bg-base-100/60 w-full animate-in zoom-in-95 duration-500">
          <div className="p-6 md:p-8 lg:p-10 gap-4 md:gap-6 flex flex-col">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl md:rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner mb-1">
                <Briefcase className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-base-content uppercase italic">Initialize Brief</h1>
                <p className="text-xs md:text-sm font-black text-base-content/30 uppercase tracking-[0.2em]">Authorized Executive Initiation</p>
              </div>
            </div>

            <TaskForm
              departments={departments}
              slas={slas}
              users={users}
              projects={projects}
              subProjects={subProjects}
              initialProjectId={initialProjectId}
              initialSubProjectId={initialSubProjectId}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mt-12 opacity-30 group cursor-default">
          <div className="h-px w-12 bg-base-content/40 group-hover:w-24 transition-all duration-700" />
          <p className="text-xs font-black uppercase tracking-[0.4em]">Operations Command</p>
        </div>
      </div>
    </div>
  )
}
