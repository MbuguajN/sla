import React from 'react'
import { auth } from '@/auth'
import prisma from '@/lib/db'
import ProjectsGrid from '@/components/ProjectsGrid'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectsPage() {
  const session = await auth()
  const role = (session?.user as any)?.role

  // Fetch projects with aggregated stats
  // In a real app we'd group by task counts more efficiently
  const projects = await prisma.project.findMany({
    include: {
      tasks: {
        select: { status: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  // Transform for display
  const projectSummaries = projects.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    createdAt: p.createdAt,
    taskCount: p.tasks.length,
    completedCount: p.tasks.filter(t => t.status === 'COMPLETED').length
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content tracking-tight">Active Projects</h1>
          <p className="text-sm font-medium text-base-content/60">Strategic directive groups and campaigns</p>
        </div>
        {(session?.user as any)?.departmentName === 'BUSINESS_DEVELOPMENT' && (
          <Link href="/projects/new" className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Initialize Project
          </Link>
        )}
      </div>

      <ProjectsGrid projects={projectSummaries} />
    </div>
  )
}
