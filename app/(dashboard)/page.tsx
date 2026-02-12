import React, { Suspense } from 'react'
import { auth } from "@/auth"
import DashboardHeader from '@/components/DashboardHeader'
import MyActiveTasks from '@/components/MyActiveTasks'
import StatsSection, { StatsSkeleton } from '@/components/dashboard/StatsSection'
import NewsSection, { NewsSkeleton } from '@/components/dashboard/NewsSection'
import TimelineSection, { TimelineSkeleton } from '@/components/dashboard/TimelineSection'
import prisma from '@/lib/db'

export default async function DashboardPage({ searchParams }: { searchParams: { date?: string, view?: string } }) {
  const session = await auth()
  const user = (session?.user as any)
  const userId = Number(user?.id)
  const userRole = user?.role || 'EMPLOYEE'
  
  const viewDate = searchParams.date ? new Date(searchParams.date) : new Date()
  const expandMode = searchParams.view === 'full'

  // We still fetch active tasks here for the sidebar/right-col for immediate feedback, 
  // or we could also suspend that, but keeping it simple for now.
  const activeUserTasks = await prisma.task.findMany({
    where: { assigneeId: userId, status: { not: 'COMPLETED' } },
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      sla: {
        select: {
          name: true,
          tier: true
        }
      }
    },
    orderBy: { dueAt: 'asc' },
    take: 5
  })

  return (
    <div className="space-y-8 bg-base-100 min-h-screen pb-12">
      <DashboardHeader initialDate={viewDate} />

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-12">
          <Suspense fallback={<TimelineSkeleton />}>
            <TimelineSection 
              userRole={userRole} 
              userId={userId} 
              viewDate={viewDate} 
              expandMode={expandMode} 
              searchParams={searchParams}
            />
          </Suspense>

          <Suspense fallback={<NewsSkeleton />}>
            <NewsSection />
          </Suspense>
        </div>

        <div className="lg:col-span-1">
           <MyActiveTasks initialTasks={activeUserTasks as any} />
        </div>
      </div>
    </div>
  )
}
