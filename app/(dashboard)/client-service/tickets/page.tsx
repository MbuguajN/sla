import React, { Suspense } from 'react'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import TicketTable from './TicketTable'
import { Inbox, Filter } from 'lucide-react'

async function TicketList({ departmentId, isManager }: { departmentId?: number, isManager?: boolean }) {
  const tickets = await prisma.task.findMany({
    where: {
      isTicket: true,
      ...(isManager && departmentId ? { departmentId } : {})
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
      project: { select: { id: true, title: true, defaultSlaId: true } },
      reporter: {
        select: { name: true, email: true }
      },
      senderName: true,
      senderEmail: true
    },
    orderBy: { createdAt: 'desc' }
  })

  const departments = await prisma.department.findMany({
    select: { id: true, name: true }
  })

  const slas = await prisma.sla.findMany({
    select: { id: true, name: true, tier: true }
  })

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
    />
  )
}

function TicketTableSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <div className="h-8 bg-base-200 animate-pulse rounded-lg w-full" />
      <div className="h-8 bg-base-200 animate-pulse rounded-lg w-full" />
      <div className="h-8 bg-base-200 animate-pulse rounded-lg w-full" />
      <div className="h-8 bg-base-200 animate-pulse rounded-lg w-full" />
    </div>
  )
}

export default async function ClientServiceTicketsPage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName
  const deptId = (session?.user as any)?.departmentId

  const isCS = deptName === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE'
  const isManager = role === 'MANAGER'
  const isAdmin = role === 'CEO'

  // STRICT HIERARCHY: CS and CEO see ALL briefs. Managers see ONLY their department's briefs.
  const filterByDept = isManager && !isAdmin && !isCS

  if (!isAdmin && !isCS && !isManager) {
    redirect('/')
  }

  return (
    <div className="space-y-8 p-6 lg:p-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Inbox className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black tracking-tighter uppercase text-base-content">Brief Hub</h1>
          </div>
          <p className="text-base-content/50 font-bold uppercase tracking-widest text-[10px]">Operational Inbox / Client Service Cluster</p>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-200 shadow-xl overflow-hidden">
        <Suspense fallback={<TicketTableSkeleton />}>
          <TicketList
            departmentId={deptId ? Number(deptId) : undefined}
            isManager={filterByDept}
          />
        </Suspense>
      </div>
    </div>
  )
}
