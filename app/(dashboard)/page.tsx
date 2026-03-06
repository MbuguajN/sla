import React, { Suspense } from 'react'
import { auth } from "@/auth"
import { redirect } from 'next/navigation'
import DashboardHeader from '@/components/DashboardHeader'
import OperationsStats from '@/components/dashboard/OperationsStats'
import GlobalTaskTable from '@/components/dashboard/GlobalTaskTable'
import ProjectsGrid from '@/components/dashboard/ProjectsGrid'
import PulseTimeline from '@/components/dashboard/PulseTimeline'
import CEODashboard from '@/components/dashboard/CEODashboard'
import prisma from '@/lib/db'

export default async function DashboardPage() {
  const session = await auth()
  const userId = Number(session?.user?.id)
  const role = (session?.user as any)?.role

  // HR role always lands on the HR dashboard
  if (role === 'HR') redirect('/hr')

  // Presence Pulse: Ensure user remains in "Active" list
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { updatedAt: new Date() }
    })
  }

  // Fetch truly active users (last 5 minutes)
  const activityWindow = new Date(Date.now() - 5 * 60 * 1000)
  const activeUsersRaw = await prisma.user.findMany({
    where: {
      OR: [
        { id: userId }, // Always include self
        { updatedAt: { gte: activityWindow } }
      ]
    },
    take: 8,
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, role: true, avatarUrl: true }
  })
  const activeUsers = activeUsersRaw.map((u: any) => ({
    ...u,
    designation: u.role,
    image: u.avatarUrl || undefined,
    color: u.id === userId ? 'bg-primary' : 'bg-neutral'
  }))

  const isAdmin = ['CEO', 'ADMIN', 'SUPER_ADMIN'].includes(role)
  const isHighVisibility = ['CLIENT_SERVICE', 'BUSINESS_DEVELOPMENT'].includes(role)

  if (isAdmin) {
    const projects = await prisma.project.findMany({
      include: {
        tasks: {
          select: { status: true, dueAt: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    const allActiveTasks = await prisma.task.findMany({
      where: {
        status: { not: 'COMPLETED' }
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        project: { select: { id: true, title: true } },
        assignee: { select: { name: true } },
        sla: { select: { name: true, tier: true } },
        reporterId: true
      },
      orderBy: { dueAt: 'asc' }
    })

    const overdueCount = await prisma.task.count({
      where: {
        status: { not: 'COMPLETED' },
        dueAt: { lt: new Date() }
      }
    })

    const activeCount = await prisma.task.count({
      where: {
        status: { not: 'COMPLETED' }
      }
    })

    return (
      <div className="bg-base-100 min-h-screen pb-20 p-6 lg:p-10 animate-in fade-in duration-500">
        <CEODashboard
          projects={projects as any}
          allActiveTasks={allActiveTasks as any}
          activeUsers={activeUsers}
          overdueCount={overdueCount}
          activeCount={activeCount}
        />
      </div>
    )
  }

  // Fetch active tasks for the Global Table
  const activeTasks = await prisma.task.findMany({
    where: {
      status: { not: 'COMPLETED' },
      ...(isHighVisibility ? {} : {
        OR: [
          { assigneeId: userId },
          { assignee: { department: { headId: userId } } } // Allow Dept Heads to see team tasks
        ]
      })
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      assigneeId: true,
      project: { select: { id: true, title: true } },
      assignee: { select: { name: true, avatarUrl: true } },
      sla: { select: { name: true, tier: true } },
      reporterId: true
    },
    orderBy: { dueAt: 'asc' },
    take: 100
  })

  const overdueCount = await prisma.task.count({
    where: {
      status: { not: 'COMPLETED' },
      dueAt: { lt: new Date() },
      ...(isHighVisibility ? {} : { assigneeId: userId })
    }
  })

  const activeCount = await prisma.task.count({
    where: {
      status: { not: 'COMPLETED' },
      ...(isHighVisibility ? {} : { assigneeId: userId })
    }
  })

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <DashboardHeader activeUsers={activeUsers} />
      </div>

      {/* Top Row: Stats & Pulse Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Suspense fallback={<div className="h-32 bg-base-200 rounded-2xl animate-pulse" />}>
            <OperationsStats
              userId={userId}
              role={role}
              departmentId={(session?.user as any)?.departmentId ? Number((session?.user as any).departmentId) : undefined}
              isAdmin={role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'CEO' || role === 'HR'}
            />
          </Suspense>
        </div>
        <div className="lg:col-span-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <Suspense fallback={<div className="h-24 bg-base-200 rounded-xl animate-pulse" />}>
            <PulseTimeline />
          </Suspense>
        </div>
      </div>

      {/* Middle Row: Main Task Table */}
      <div className="grid grid-cols-1 gap-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <Suspense fallback={<div className="h-96 bg-base-200 rounded-2xl animate-pulse" />}>
          <GlobalTaskTable initialTasks={activeTasks as any} currentUserId={userId} currentUserRole={role} />
        </Suspense>
      </div>

      {/* Bottom Row: Active Projects Overview */}
      <div className="pt-4 border-t border-base-200/50 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <Suspense fallback={<div className="h-48 bg-base-200 rounded-2xl animate-pulse" />}>
          <ProjectsGrid />
        </Suspense>
      </div>
    </div>
  )
}
