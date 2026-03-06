import React from 'react'
import { auth } from '@/auth'
import prisma from '@/lib/db'
import ProjectsGrid from '@/components/ProjectsGrid'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectsPage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  const userId = Number(session?.user?.id)
  const deptName = (session?.user as any)?.departmentName

  const isAdmin = ['ADMIN', 'CEO', 'SUPER_ADMIN'].includes(role)
  const isManagement = isAdmin || ['BUSINESS_DEVELOPMENT', 'CLIENT_SERVICE', 'MANAGER'].includes(role)

  // Fetch projects with aggregated stats including sub-projects
  let whereClause: any = {}
  if (role === 'CLIENT_SERVICE') {
    whereClause = { createdById: userId }
  } else if (!isAdmin && role !== 'BUSINESS_DEVELOPMENT' && role !== 'MANAGER') {
    // Regular employees see only projects they are invited to
    whereClause = { members: { some: { userId } } }
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      tasks: {
        select: { status: true }
      },
      members: {
        include: {
          user: {
            select: { name: true }
          }
        }
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
    const subProjectTaskCount = (p.subProjects as any[]).reduce((acc: number, sub: any) => {
      const subletTaskCount = (sub.children as any[]).reduce((a: number, c: any) => a + (c._count?.tasks || 0), 0)
      return acc + (sub._count?.tasks || 0) + subletTaskCount
    }, 0)
    const totalTaskCount = p.tasks.length + subProjectTaskCount

    const directCompleted = (p.tasks as any[]).filter(t => t.status === 'COMPLETED').length

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
      members: p.members,
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
