import React, { Suspense } from 'react'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import DepartmentQueueClient from '@/components/DepartmentQueueClient'
import Link from 'next/link'
import { ShieldCheck, Loader2 } from 'lucide-react'

export default async function DepartmentQueuePage({ params }: { params: { id: string } }) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user) redirect('/login')

  const deptId = parseInt(params.id)
  if (isNaN(deptId)) return notFound()
  
  // Fetch department basic info immediately
  const department = await prisma.department.findUnique({
    where: { id: deptId },
    select: {
      id: true,
      name: true,
      headId: true,
      users: { 
        select: { 
          id: true,
          name: true,
          email: true
        } 
      }
    }
  })

  if (!department) return notFound()

  return (
    <div className="space-y-6">
      <Suspense fallback={<QueueSkeleton departmentName={department.name} />}>
        <DepartmentQueueDataWrapper 
          department={department} 
          user={user} 
        />
      </Suspense>
    </div>
  )
}

async function DepartmentQueueDataWrapper({ department, user }: { department: any, user: any }) {
  // Fetch tasks in a separate suspended component
  const isSuperAdmin = user.role === 'SUPER_ADMIN'
  const isAdmin = user.role === 'ADMIN'
  const isManager = user.role === 'MANAGER'
  const isDeptHead = department.headId === Number(user.id)
  const isDeptMember = user.departmentId === department.id
  
  const hasGeneralAccess = isSuperAdmin || isAdmin || isManager || isDeptHead || isDeptMember
  const deptUserIds = department.users.map((u: any) => u.id)
  
  const tasks = await prisma.task.findMany({
    where: { assigneeId: { in: deptUserIds } },
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      createdAt: true,
      sla: {
        select: {
          name: true,
          tier: true,
        }
      },
      assignee: {
        select: {
          id: true,
          name: true,
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          content: true,
          createdAt: true
        }
      },
      watchers: {
        select: {
          userId: true
        }
      }
    },
    orderBy: { dueAt: 'asc' }
  })

  let visibleTasks = tasks
  
  if (!hasGeneralAccess) {
    visibleTasks = tasks.filter(t => t.watchers.some(w => w.userId === Number(user.id)))
    if (visibleTasks.length === 0) {
      return (
        <div className="p-10 flex flex-col items-center justify-center gap-4 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-error/10 text-error rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
             <h1 className="text-2xl font-black uppercase tracking-tight">Restricted Access</h1>
             <p className="text-base-content/60 font-medium">You are not authorized to view the <strong>{department.name}</strong> queue.</p>
          </div>
          <Link href="/" className="btn btn-primary mt-4 uppercase font-black">Return to Dashboard</Link>
        </div>
      )
    }
  }

  return (
    <DepartmentQueueClient 
      departmentName={department.name}
      currentUser={user}
      tasks={visibleTasks as any}
      isManager={isManager}
      isDeptHead={isDeptHead}
      members={department.users}
    />
  )
}

function QueueSkeleton({ departmentName }: { departmentName: string }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-base-300 rounded-xl" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-base-300 rounded" />
          <div className="h-4 w-32 bg-base-300 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 bg-base-300 rounded-xl" />
        <div className="h-20 bg-base-300 rounded-xl" />
        <div className="h-20 bg-base-300 rounded-xl" />
      </div>
      <div className="h-96 bg-base-300 rounded-2xl" />
    </div>
  )
}
