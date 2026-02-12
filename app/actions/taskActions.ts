'use server'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TaskStatus, Role } from '@prisma/client'
import { auth } from '@/auth'
import { createNotification as createSystemNotification, notifyDepartmentHead, NotificationType } from '@/lib/notifications'

async function createAuditLog(taskId: number, userId: number, action: string, oldValue?: string, newValue?: string) {
  return prisma.auditLog.create({
    data: { taskId, userId, action, oldValue, newValue }
  })
}
async function notifyWatchers(taskId: number, content: string, type: string) {
  const watchers = await prisma.watcher.findMany({
    where: { taskId }
  })
  return Promise.all(watchers.map(w => createSystemNotification(w.userId, content, type as NotificationType)))
}

export async function createTask(formData: {
  title: string
  description?: string
  slaId?: number
  assigneeId?: number
  projectId?: number
  watcherIds: number[]
  dueAt: Date
}) {
  const session = await auth()
  const operatorId = Number(session?.user?.id)
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName
  
  const isCS = role === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE' || deptName === 'CLIENT_SERVICE'
  const isDeptMember = !!(session?.user as any)?.departmentId || role === 'DEPT_HEAD'
  
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && !isCS && !isDeptMember) {
    throw new Error('Unauthorized operational clearance')
  }

  const task = await prisma.task.create({
    data: {
      title: formData.title,
      description: formData.description,
      status: TaskStatus.PENDING,
      slaId: formData.slaId || 1, // Fallback to STANDARD or similar if not provided
      assigneeId: formData.assigneeId,
      projectId: formData.projectId,
      reporterId: operatorId, // Current user is the reporter
      dueAt: formData.dueAt,
      watchers: {
        create: formData.watcherIds.map(userId => ({ userId }))
      }
    }
  })

  // RECORD AUDIT
  await createAuditLog(task.id, operatorId, 'TASK_CREATED', undefined, task.title)
  
  // TRIGGER NOTIFICATIONS
  if (formData.assigneeId) {
    await createSystemNotification(formData.assigneeId, `New Directive: ${formData.title}`, 'TASK_ASSIGNED')
    // Auto-watcher for Dept Head happens on assignment
    await performAutoWatcherLogic(task.id, formData.assigneeId)
  }
  for (const wId of formData.watcherIds) {
    await createSystemNotification(wId, `Assigned as Watcher: ${formData.title}`, 'TASK_ASSIGNED')
  }

  if (formData.projectId) {
    // Notify anyone associated with the project (simulated for now by notifying all project task assignees)
    const projectPeople = await prisma.task.findMany({
      where: { projectId: formData.projectId },
      select: { assigneeId: true }
    })
    const uniquePeople = [...new Set(projectPeople.map(p => p.assigneeId).filter(Boolean))] as number[]
    for (const personId of uniquePeople) {
      if (personId !== formData.assigneeId) {
        await createSystemNotification(personId, `Project Update: New task "${formData.title}" added to project.`, 'PROJECT_ADDED')
      }
    }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  return task
}

async function performAutoWatcherLogic(taskId: number, assigneeId: number) {
  const user = await prisma.user.findUnique({
    where: { id: assigneeId },
    include: { department: true }
  })
  if (user?.department?.headId) {
    const headId = user.department.headId
    await prisma.watcher.upsert({
      where: { userId_taskId: { userId: headId, taskId } },
      create: { userId: headId, taskId },
      update: {}
    })
    await createSystemNotification(headId, `Visibility automated: Monitoring task ${taskId} for your department.`, 'AUTO_WATCHER')
  }
}

export async function assignTask(taskId: number, assigneeId: number) {
  const session = await auth()
  const operatorId = Number(session?.user?.id)
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName

  const isCS = role === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE' || deptName === 'CLIENT_SERVICE'

  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && !isCS) {
    const isDeptHead = role === 'DEPT_HEAD'
    const targetTask = await prisma.task.findUnique({ 
      where: { id: taskId },
      include: { assignee: true }
    })
    const isHisMember = targetTask?.assignee?.departmentId === (session?.user as any)?.departmentId
    
    if (!(isDeptHead && isHisMember)) {
      throw new Error(`Unauthorized operational clearance. Role: ${role}, Dept: ${deptName}. Reassignment restricted to Dept Heads of the member's department.`)
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId }
  })

  await performAutoWatcherLogic(taskId, assigneeId)
  await createAuditLog(taskId, operatorId, 'TASK_ASSIGNED', undefined, `Assigned to user ${assigneeId}`)
  await createSystemNotification(assigneeId, `Resource assigned: ${task.title}`, 'ASSIGNMENT')

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/', 'layout')
  return task
}

export async function pauseTask(taskId: number, reason: string) {
  const session = await auth()
  const operatorId = Number(session?.user?.id)
  
  const oldTask = await prisma.task.findUnique({ where: { id: taskId } })
  
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: TaskStatus.AWAITING_INFO,
      pauseReason: reason
    }
  })

  await createAuditLog(taskId, operatorId, 'TASK_PAUSED', oldTask?.status, reason)

  if (task.reporterId) {
    await createSystemNotification(task.reporterId, `Action Required: Task ${task.title} paused. Reason: ${reason}`, 'PAUSE_ALERT')
  }

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/', 'layout')
  return task
}

export async function advanceTaskStatus(taskId: number, newStatus: TaskStatus) {
  const data: any = { status: newStatus }
  
  if (newStatus === TaskStatus.IN_PROGRESS) {
    data.startedAt = newStatus === TaskStatus.IN_PROGRESS ? new Date() : undefined
  } else if (newStatus === TaskStatus.COMPLETED) {
    data.completedAt = new Date()
  }
  
  const oldTask = await prisma.task.findUnique({ where: { id: taskId } })
  
  const task = await prisma.task.update({
    where: { id: taskId },
    data
  })

  // RECORD AUDIT
  const session = await auth()
  const operatorId = Number(session?.user?.id)
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName

  const isCS = role === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE' || deptName === 'CLIENT_SERVICE'

  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && !isCS) {
    // Strict Lock Implementation
    if (newStatus === TaskStatus.RECEIVED || newStatus === TaskStatus.IN_PROGRESS) {
      if (operatorId !== oldTask?.assigneeId) {
        throw new Error('Lock Violation: Only the designated assignee can initialize status transition to RECEIVED or IN_PROGRESS.')
      }
    }

    if (newStatus === TaskStatus.COMPLETED) {
       throw new Error('Operational Barrier: Only Client Service or Admin personnel can authorize Directive Completion.')
    }

    if (operatorId !== oldTask?.assigneeId) {
      throw new Error('Unauthorized status transition: Personnel identity mismatch.')
    }
  }

  if (session?.user?.id) {
    await createAuditLog(taskId, Number(session.user.id), 'STATUS_CHANGE', oldTask?.status, newStatus)
  }

  // SMART NOTIFICATION FOR WATCHERS
  if (newStatus === TaskStatus.REVIEW) {
    await notifyWatchers(taskId, `Task ready for review: ${task.title}`, 'STATUS_REVIEW')
  }
  
  revalidatePath('/', 'layout')
  revalidatePath(`/tasks/${taskId}`)
  return task
}

export async function updateTaskStatus(taskId: number, status: TaskStatus) {
  return advanceTaskStatus(taskId, status)
}

export async function checkAndNotifyBreaches() {
  const breachedTasks = await prisma.task.findMany({
    where: {
      status: { notIn: [TaskStatus.COMPLETED] },
      dueAt: { lt: new Date() },
    },
    select: {
      id: true,
      assignee: {
        select: {
          department: {
            select: {
              headId: true
            }
          }
        }
      }
    }
  })

  for (const task of breachedTasks) {
    const headId = (task.assignee as any)?.department?.headId
    if (headId) {
      await createSystemNotification(headId, `BREACH ALERT: Directive #${task.id} has failed SLA compliance. Immediate intervention required.`, 'BREACH_ALERT')
    }
  }
}

export async function sendMessage(taskId: number | null, authorId: number, content: string, projectId?: number | null) {
  const msg = await prisma.message.create({
    data: {
      taskId: taskId || undefined,
      authorId,
      content,
      projectId: projectId || undefined,
    },
  })

  // RECORD AUDIT
  if (taskId) {
    await createAuditLog(taskId, authorId, 'COMMENT_ADDED', undefined, content.substring(0, 50))
    const task = await prisma.task.findUnique({ where: { id: taskId } })
    await notifyWatchers(taskId, `New operational directive comment: ${task?.title}`, 'COMMENT')
  }

  revalidatePath('/dashboard')
  if (taskId) revalidatePath(`/tasks/${taskId}`)
  return msg
}

export async function processTicket(
  taskId: number, 
  departmentId: number, 
  slaId?: number, 
  assigneeId?: number,
  options?: { description?: string, dueAt?: Date }
) {
  const session = await auth()
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName

  const isCS = role === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE' || deptName === 'CLIENT_SERVICE'

  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && !isCS) {
    throw new Error('Unauthorized operational clearance')
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      departmentId,
      slaId: options?.dueAt ? 1 : (slaId || 1), // Fallback to SLA 1 if manual or missing
      assigneeId: assigneeId || null,
      description: options?.description || undefined,
      dueAt: options?.dueAt || undefined,
      isTicket: true, 
      status: assigneeId ? TaskStatus.IN_PROGRESS : TaskStatus.PENDING
    }
  })

  // Record audit for assignment if applicable
  if (assigneeId) {
     const operatorId = Number(session?.user?.id)
     await createAuditLog(taskId, operatorId, 'TICKET_ASSIGNED', undefined, `Assigned to user ${assigneeId} during processing`)
     await performAutoWatcherLogic(taskId, assigneeId)
     await createSystemNotification(assigneeId, `New Ticket Assignment: ${task.title}`, 'ASSIGNMENT')
  }

  revalidatePath('/client-service/tickets')
  return task
}

export async function dismissTicket(taskId: number) {
  const session = await auth()
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName

  const isCS = role === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE' || deptName === 'CLIENT_SERVICE'

  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && !isCS) {
    throw new Error('Unauthorized operational clearance')
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.DISMISSED
    }
  })

  revalidatePath('/client-service/tickets')
  return task
}
