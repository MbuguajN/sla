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

  // 2. Add user as watcher to all tasks using batching
  await prisma.watcher.createMany({
    data: tasks.map(task => ({
      userId,
      taskId: task.id
    })),
    skipDuplicates: true
  })

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
  
  const isCS = role === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE' || deptName === 'CLIENT_SERVICE'
  
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && !isCS) {
    throw new Error('Unauthorized')
  }
  
  const project = await prisma.project.create({
    data: { title: formData.title, description: formData.description }
  })
  
  revalidatePath('/projects')
  return project
}
