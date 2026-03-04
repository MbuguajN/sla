import React, { Suspense } from 'react'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import TicketTable from './TicketTable'
import { Inbox } from 'lucide-react'

async function TicketList({
  departmentId,
  isManager,
  currentUserId,
  isBDUser,
  userRole,
  userDept
}: {
  departmentId?: number,
  isManager?: boolean,
  currentUserId: number,
  isBDUser: boolean,
  userRole: string,
  userDept: string
}) {
  const tickets = await prisma.task.findMany({
    where: {
      isTicket: true,
      ...(isBDUser
        ? { reporterId: currentUserId }
        : isManager && departmentId
          ? { departmentId }
          : {}
      )
    },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      departmentId: true,
      projectId: true,
      slaId: true,
      dueAt: true,
      reporterId: true,
      project: { select: { id: true, title: true, defaultSlaId: true } },
      reporter: {
        select: { id: true, name: true, email: true }
      },
      assignee: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const departments = await prisma.department.findMany({ select: { id: true, name: true } })
  const slas = await prisma.sla.findMany({ select: { id: true, name: true, tier: true } })
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, departmentId: true, department: { select: { name: true } } },
    orderBy: { name: 'asc' }
  })

  return (
    <TicketTable
      initialTickets={tickets as any}
      departments={departments}
      slas={slas}
      users={users as any}
      currentUserId={currentUserId}
      userRole={userRole}
      userDept={userDept}
    />
  )
}

function TicketTableSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <div className="h-8 bg-base-200 animate-pulse rounded-lg w-full" />
      <div className="h-8 bg-base-200 animate-pulse rounded-lg w-full" />
      <div className="h-8 bg-base-200 animate-pulse rounded-lg w-full" />
    </div>
  )
}

export default async function ClientServiceTicketsPage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName || ''
  const deptId = (session?.user as any)?.departmentId

  const isCS = deptName === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE'
  const isBD = deptName === 'BUSINESS_DEVELOPMENT' || deptName === 'BUSINESS DEVELOPMENT'
  const isManager = role === 'MANAGER'
  const isAdmin = role === 'ADMIN' || role === 'CEO' || role === 'HR'

  const filterByDept = isManager && !isAdmin && !isCS && !isBD

  if (!isAdmin && !isCS && !isManager && !isBD) {
    redirect('/')
  }

  const currentUserId = session?.user?.id ? Number(session.user.id) : 0

  return (
    <div className="space-y-8 p-6 lg:p-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Inbox className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black tracking-tighter uppercase text-base-content">Briefs</h1>
          </div>
          <p className="text-base-content/50 font-bold uppercase tracking-widest text-[10px]">Incoming Briefs</p>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-200 shadow-xl overflow-hidden">
        <Suspense fallback={<TicketTableSkeleton />}>
          <TicketList
            departmentId={deptId ? Number(deptId) : undefined}
            isManager={filterByDept}
            currentUserId={currentUserId}
            isBDUser={isBD && !isAdmin}
            userRole={role}
            userDept={deptName}
          />
        </Suspense>
      </div>
    </div>
  )
}
