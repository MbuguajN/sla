import React from 'react'
import { auth } from '@/auth'
import prisma from '@/lib/db'
import ProjectsGrid from '@/components/ProjectsGrid'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectsPage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName

  // Fetch projects with aggregated stats including sub-projects
  const projects = await prisma.project.findMany({
    include: {
      tasks: {
        select: { status: true }
      },
      subProjects: {
        where: { parentId: null },
        include: {
          _count: { select: { tasks: true, children: true } },
          children: {
            include: {
              _count: { select: { tasks: true } }
            }
          }
        }
      },
      createdBy: {
        select: { name: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  // Transform for display
  const projectSummaries = projects.map(p => {
    // Count all tasks: direct tasks + sub-project tasks + sublet tasks
    const subProjectTaskCount = p.subProjects.reduce((acc, sub) => {
      const subletTaskCount = sub.children.reduce((a, c) => a + c._count.tasks, 0)
      return acc + sub._count.tasks + subletTaskCount
    }, 0)
    const totalTaskCount = p.tasks.length + subProjectTaskCount

    const directCompleted = p.tasks.filter(t => t.status === 'COMPLETED').length

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      status: (p as any).status || 'ACTIVE',
      createdAt: p.createdAt,
      createdBy: p.createdBy?.name || null,
      taskCount: totalTaskCount,
      directTaskCount: p.tasks.length,
      completedCount: directCompleted,
      subProjectCount: p.subProjects.length,
    }
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content tracking-tight">Active Projects</h1>
          <p className="text-sm font-medium text-base-content/60">Strategic directive groups, sub-projects, and campaigns</p>
        </div>
        {deptName === 'BUSINESS_DEVELOPMENT' && (
          <Link href="/projects/new" className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Initialize Project
          </Link>
        )}
      </div>

      <ProjectsGrid projects={projectSummaries} />
    </div>
  )
}
