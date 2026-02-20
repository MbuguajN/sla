'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function inviteToProject(projectId: number, userId: number) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  // 1. Get all tasks in project
  const tasks = await prisma.task.findMany({
    where: { projectId }
  })

  // 2. Add user as watcher to all tasks using batching (SQLite workaround: individual upserts)
  await Promise.all(
    tasks.map(task =>
      prisma.watcher.upsert({
        where: { userId_taskId: { userId, taskId: task.id } },
        create: { userId, taskId: task.id },
        update: {}
      })
    )
  )

  // 3. Create a notification for the user
  await prisma.notification.create({
    data: {
      userId,
      content: `You have been added to all directives in Project #${projectId}.`,
      type: "TASK_ASSIGNED"
    }
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/tasks`)
  return { success: true }
}

export async function getProjectWatchers(projectId: number) {
  // This is tricky because watchers are per task.
  // We'll return unique users watching any task in this project.
  const watchers = await prisma.watcher.findMany({
    where: {
      task: { projectId }
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  // Dedup
  const uniqueUsers = Array.from(new Map(watchers.map(w => [w.user.id, w.user])).values())
  return uniqueUsers
}

export async function createProject(formData: { title: string; description?: string }) {
  const session = await auth()
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName
  const isCEO = role === 'CEO'
  const isBD = deptName === 'BUSINESS_DEVELOPMENT' || (session?.user as any)?.department?.name === 'BUSINESS_DEVELOPMENT'

  if (role !== 'ADMIN' && !(isCEO && isBD)) {
    throw new Error('STRATEGIC DENIAL: Project initiation requires both CEO clearance and Business Development alignment.')
  }

  const project = await prisma.project.create({
    data: { title: formData.title, description: formData.description }
  })

  revalidatePath('/projects')
  return project
}
