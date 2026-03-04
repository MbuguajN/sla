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
  Briefcase,
  FolderOpen,
  GitBranch,
  Settings2
} from 'lucide-react'
import Link from 'next/link'
import TaskChat from '@/components/TaskChat'
import InviteMember from '@/components/InviteMember'
import ProjectDetailTabs from '@/components/ProjectDetailTabs'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return null

  const projectId = parseInt(params.id)
  if (isNaN(projectId)) notFound()

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      defaultSla: true,
      createdBy: { select: { name: true } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          sla: true
        },
        where: { subProjectId: null } as any,
        orderBy: { createdAt: 'desc' }
      },
      subProjects: {
        where: { parentId: null },
        include: {
          createdBy: { select: { id: true, name: true } },
          children: {
            include: {
              _count: { select: { tasks: true } }
            }
          },
          _count: { select: { tasks: true, children: true } }
        },
        orderBy: { createdAt: 'desc' }
      },
      messages: {
        include: { author: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  }) as any

  if (!project) notFound()

  // Stats
  const directTaskCount = project.tasks.length
  const directCompletedCount = project.tasks.filter(t => t.status === 'COMPLETED').length
  const subProjectCount = project.subProjects.length
  const totalSubletCount = project.subProjects.reduce((acc, s) => acc + s._count.children, 0)

  // Overall progress (direct tasks only for now)
  const progress = directTaskCount > 0
    ? Math.round((directCompletedCount / directTaskCount) * 100)
    : 0

  const userDept = (session.user as any)?.departmentName
  const userRole = (session.user as any)?.role
  const canCreateSub = userDept === 'CLIENT_SERVICE' || userDept === 'BUSINESS_DEVELOPMENT' || userRole === 'ADMIN'

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col gap-5">
        <Link href="/projects" className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:translate-x-[-4px] transition-transform w-fit opacity-60">
          <ArrowLeft className="w-3 h-3" /> Back to Projects
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-base-content tracking-tighter uppercase">{project.title}</h1>
                {project.createdBy && (
                  <p className="text-[10px] font-bold text-base-content/30 uppercase tracking-wider mt-1">
                    Created by {project.createdBy.name}
                  </p>
                )}
              </div>
            </div>
            <p className="text-base-content/60 max-w-3xl font-medium text-base leading-relaxed italic">
              {project.description || "Project is currently active."}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {(userDept === 'CLIENT_SERVICE' || userDept === 'CLIENT SERVICE' || userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT') && (
              <Link href={`/tasks/new?projectId=${projectId}`} className="btn btn-primary btn-md px-6 rounded-2xl gap-2 shadow-lg shadow-primary/20 uppercase font-black tracking-widest text-[10px]">
                <Plus className="w-4 h-4" /> New Task
              </Link>
            )}
            <InviteMember projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Metric Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Default SLA</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-black text-base">{project.defaultSla?.name || "Unset"}</span>
          </div>
          {project.defaultSla && (
            <p className="text-[9px] font-bold opacity-60 uppercase">{project.defaultSla.durationHrs}H / {project.defaultSla.tier}</p>
          )}
        </div>

        <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Progress</span>
          <div className="flex items-center gap-3">
            <span className="font-black text-xl text-primary">{progress}%</span>
            <div className="flex-1 bg-base-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <p className="text-[9px] font-bold opacity-60 uppercase">{directCompletedCount}/{directTaskCount} Direct Tasks</p>
        </div>

        <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Sub-Projects</span>
          <div className="flex items-center gap-2 text-warning">
            <FolderOpen className="w-4 h-4" />
            <span className="font-black text-xl">{subProjectCount}</span>
          </div>
          <p className="text-[9px] font-bold opacity-60 uppercase">Active Scopes</p>
        </div>

        <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Sublets</span>
          <div className="flex items-center gap-2 text-info">
            <GitBranch className="w-4 h-4" />
            <span className="font-black text-xl">{totalSubletCount}</span>
          </div>
          <p className="text-[9px] font-bold opacity-60 uppercase">Nested Units</p>
        </div>

        <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-base-content/40">Status</span>
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-black text-base uppercase tracking-tighter">{(project as any).status || 'Active'}</span>
          </div>
          <p className="text-[9px] font-bold opacity-60 uppercase">On Track</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Tabbed Content */}
        <div className="lg:col-span-2 space-y-6">
          <ProjectDetailTabs
            projectId={projectId}
            subProjects={project.subProjects as any}
            directTasks={project.tasks as any}
            canCreateSub={canCreateSub}
          />
        </div>

        {/* Right Column: Activity Feed */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/40">Activity Log</h2>
            <div className="badge badge-primary badge-outline text-[9px] font-black uppercase">{project.messages.length} Messages</div>
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
