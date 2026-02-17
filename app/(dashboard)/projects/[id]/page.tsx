import React from 'react'
import { auth } from '@/auth'
import prisma from '@/lib/db'
import { notFound } from 'next/navigation'
import {
  Plus,
  ClipboardList,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Briefcase
} from 'lucide-react'
import Link from 'next/link'
import TaskChat from '@/components/TaskChat'
import InviteMember from '@/components/InviteMember'
import ProjectTaskTabs from '@/components/ProjectTaskTabs'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return null

  const projectId = parseInt(params.id)
  if (isNaN(projectId)) notFound()

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      defaultSla: true,
      tasks: {
        include: {
          assignee: true,
          sla: true
        },
        orderBy: { createdAt: 'desc' }
      },
      messages: {
        include: {
          author: true
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!project) notFound()

  const completedTasksCount = project.tasks.filter(t => t.status === 'COMPLETED').length
  const progress = project.tasks.length > 0
    ? Math.round((completedTasksCount / project.tasks.length) * 100)
    : 0

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col gap-5">
        <Link href="/projects" className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:translate-x-[-4px] transition-transform w-fit opacity-60">
          <ArrowLeft className="w-3 h-3" /> Back to Fleet Operations
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <Briefcase className="w-5 h-5" />
              </div>
              <h1 className="text-5xl font-black text-base-content tracking-tighter uppercase">{project.title}</h1>
            </div>
            <p className="text-base-content/60 max-w-3xl font-medium text-lg leading-relaxed italic">{project.description || "Project operational shell active."}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href={`/tasks/new?projectId=${projectId}`} className="btn btn-primary btn-md px-8 rounded-2xl gap-3 shadow-lg shadow-primary/20 uppercase font-black tracking-widest text-xs">
              <Plus className="w-4 h-4" /> Deploy Task
            </Link>
            <InviteMember projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Metric Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-base-100 border border-base-200 shadow-sm p-6 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Default Protocol</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-black text-lg">{project.defaultSla?.name || "Unset"}</span>
          </div>
          {project.defaultSla && (
            <p className="text-[10px] font-bold opacity-60 uppercase">{project.defaultSla.durationHrs}H Turnaround / {project.defaultSla.tier} Tier</p>
          )}
        </div>

        <div className="card bg-base-100 border border-base-200 shadow-sm p-6 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Fleet Progress</span>
          <div className="flex items-center gap-3">
            <span className="font-black text-2xl text-primary">{progress}%</span>
            <div className="flex-1 bg-base-200 h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <p className="text-[10px] font-bold opacity-60 uppercase">{completedTasksCount} / {project.tasks.length} Directives Finalized</p>
        </div>

        <div className="card bg-base-100 border border-base-200 shadow-sm p-6 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Active Directives</span>
          <div className="flex items-center gap-2 text-primary">
            <ClipboardList className="w-5 h-5" />
            <span className="font-black text-2xl">{project.tasks.filter(t => t.status !== 'COMPLETED').length}</span>
          </div>
          <p className="text-[10px] font-bold opacity-60 uppercase">In-flight Operations</p>
        </div>

        <div className="card bg-base-100 border border-base-200 shadow-sm p-6 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Global Status</span>
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-black text-lg uppercase tracking-tighter">Operational</span>
          </div>
          <p className="text-[10px] font-bold opacity-60 uppercase">Strategic Health: Optimal</p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Left Column: Tasks Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <ProjectTaskTabs tasks={project.tasks as any} />
        </div>

        {/* Right Column: Feed/Chat */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/40">Mission Log</h2>
            <div className="badge badge-primary badge-outline text-[9px] font-black uppercase">{project.messages.length} Entries</div>
          </div>
          <TaskChat
            taskId={undefined}
            projectId={projectId}
            initialMessages={project.messages as any}
            currentUserId={parseInt(session?.user?.id || "0")}
          />
        </div>

      </div>
    </div>
  )
}
