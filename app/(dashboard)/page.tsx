import React, { Suspense } from 'react'
import { auth } from "@/auth"
import DashboardHeader from '@/components/DashboardHeader'
import OperationsStats from '@/components/dashboard/OperationsStats'
import GlobalTaskTable from '@/components/dashboard/GlobalTaskTable'
import ProjectsGrid from '@/components/dashboard/ProjectsGrid'
import PulseTimeline from '@/components/dashboard/PulseTimeline'
import prisma from '@/lib/db'

export default async function DashboardPage() {
  const session = await auth()
  const userId = Number(session?.user?.id)

  // Presence Pulse: Ensure user remains in "Active" list
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { updatedAt: new Date() }
    })
  }

  // Fetch active tasks for the Global Table
  // We fetch a bit more data here to populate the table fully
  const activeTasks = await prisma.task.findMany({
    where: {
      status: { not: 'COMPLETED' },
      OR: [
        { assigneeId: userId },
        { assignee: { department: { headId: userId } } } // If Dept Head
      ]
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      project: { select: { id: true, title: true } },
      assignee: { select: { name: true, avatarUrl: true } },
      sla: { select: { name: true, tier: true } }
    },
    orderBy: { dueAt: 'asc' },
    take: 50
  })

  const role = (session?.user as any)?.role

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
    select: { id: true, name: true }
  })
  const activeUsers = activeUsersRaw.map((u: { id: number, name: string | null }) => ({
    ...u,
    color: u.id === userId ? 'bg-primary' : 'bg-neutral'
  }))

  return (
    <div className="space-y-10 bg-base-100 min-h-screen pb-20 p-6 lg:p-10 animate-in fade-in duration-500">
      {/* Header Section */}
      <DashboardHeader activeUsers={activeUsers} />

      {/* Top Row: Stats & Pulse Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-32 bg-base-200 rounded-2xl animate-pulse" />}>
            <OperationsStats
              departmentId={(session?.user as any)?.departmentId ? Number((session?.user as any).departmentId) : undefined}
              isAdmin={role === 'SUPER_ADMIN' || role === 'ADMIN'}
            />
          </Suspense>
        </div>
        <div className="lg:col-span-3">
          <Suspense fallback={<div className="h-24 bg-base-200 rounded-xl animate-pulse" />}>
            <PulseTimeline />
          </Suspense>
        </div>
      </div>

      {/* Middle Row: Main Task Table */}
      <div className="grid grid-cols-1 gap-6">
        <Suspense fallback={<div className="h-96 bg-base-200 rounded-2xl animate-pulse" />}>
          <GlobalTaskTable initialTasks={activeTasks as any} />
        </Suspense>
      </div>

      {/* Bottom Row: Active Projects Overview */}
      <div className="pt-4 border-t border-base-200">
        <Suspense fallback={<div className="h-48 bg-base-200 rounded-2xl animate-pulse" />}>
          <ProjectsGrid />
        </Suspense>
      </div>
    </div>
  )
}
