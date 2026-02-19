export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
// @ts-ignore - Temporary bypass for locked types
import GlobalTaskIndexClient from './GlobalTaskIndexClient'

export default async function GlobalTaskIndexPage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName

  const isCS = deptName === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE'
  const isCEO = role === 'CEO'
  const isHR = role === 'HR'
  const isManager = role === 'MANAGER' || isCEO || isHR
  const isBusinessDev = deptName === 'BUSINESS_DEVELOPMENT'
  const isAdmin = role === 'ADMIN'

  // CEO, Managers, CS, BDev, HR have access
  if (!isAdmin && !isManager && !isCS && !isBusinessDev && !isCEO && !isHR) {
    redirect('/')
  }

  const tasks = await prisma.task.findMany({
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
          name: true,
          id: true,
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          content: true,
          createdAt: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }) as any

  return <GlobalTaskIndexClient initialTasks={tasks} />
}
