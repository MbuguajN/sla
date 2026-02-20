'use server'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TaskStatus } from '@/lib/enums'
import { auth } from '@/auth'
import { createNotification as createSystemNotification, notifyDepartmentHead, NotificationType } from '@/lib/notifications'

async function createAuditLog(taskId: number, userId: number, action: string, oldValue?: string, newValue?: string) {
  return prisma.auditLog.create({
    data: { taskId, userId, action, oldValue, newValue }
  })
}

async function notifyWatchers(taskId: number, content: string, type: string, link?: string) {
  const watchers = await prisma.watcher.findMany({
    where: { taskId }
  })
  const taskLink = link || `/tasks/${taskId}`
  return Promise.all(watchers.map(w => createSystemNotification(w.userId, content, type as NotificationType, taskLink)))
}

async function performAutoWatcherLogic(taskId: number, assigneeId: number) {
  const user = await prisma.user.findUnique({
    where: { id: assigneeId },
    include: { department: { include: { head: { select: { role: true } } } } }
  })
  if (user?.department?.headId) {
    // Skip admin/system users — they should only get system-level alerts
    const headRole = user.department.head?.role
    if (headRole === 'ADMIN' || headRole === 'SYSTEM') return

    const headId = user.department.headId
    await prisma.watcher.upsert({
      where: { userId_taskId: { userId: headId, taskId } },
      create: { userId: headId, taskId },
      update: {}
    })
    await createSystemNotification(headId, `Visibility automated: Monitoring task ${taskId} for your department.`, 'AUTO_WATCHER', `/tasks/${taskId}`)
  }
}

export async function createTask(data: {
  title: string
  description?: string
  slaId: number
  assigneeId?: number
  departmentId: number
  watcherIds?: number[]
  dueAt: Date
  projectId?: number
  isTicket?: boolean
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')
    const operatorId = parseInt(session.user.id)

    // STRICTURE: Only BDev can create briefs (tasks without a project)
    // Client Service can initialize tasks but only within specific projects
    const userRole = (session.user as any).role
    const userDept = (session.user as any).departmentName

    const isBD = userDept === 'BUSINESS_DEVELOPMENT' || userRole === 'ADMIN'
    const isCS = userDept === 'CLIENT_SERVICE'

    if (!isBD && !isCS) {
      throw new Error('STRATEGIC DENIAL: Directive initiation is restricted to Business Development and Client Service departments.')
    }


    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        slaId: data.slaId,
        assigneeId: data.assigneeId,
        departmentId: data.departmentId,
        projectId: data.projectId,
        isTicket: data.isTicket ?? true,
        reporterId: operatorId,
        dueAt: data.dueAt,
        status: 'PENDING',
        watchers: data.watcherIds ? {
          create: data.watcherIds.map(userId => ({ userId }))
        } : undefined
      }
    })

    // RECORD AUDIT
    await createAuditLog(task.id, operatorId, 'TASK_CREATED', undefined, task.title)

    // Notify Department Head with a link to the task
    await notifyDepartmentHead(
      data.departmentId,
      `New Brief Assigned: ${data.title}`,
      'TASK_ASSIGNED',
      `/tasks/${task.id}`
    )

    revalidatePath('/', 'layout')
    revalidatePath('/tasks')
    return { success: true, task }
  } catch (error: any) {
    console.error('Create Task Error:', error)
    return { success: false, error: error.message }
  }
}

export async function assignTask(taskId: number, assigneeId: number) {
  try {
    const session = await auth()
    const operatorId = Number(session?.user?.id)
    if (!operatorId) throw new Error('Unauthorized')

    const oldTask = await prisma.task.findUnique({ where: { id: taskId } })
    if (oldTask?.status === TaskStatus.COMPLETED) {
      throw new Error('STRATEGIC DENIAL: Cannot reassign a finalized directive.')
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeId,
        status: TaskStatus.IN_PROGRESS // Auto-advance to IN_PROGRESS on assignment
      }
    })

    await performAutoWatcherLogic(taskId, assigneeId)
    await createAuditLog(taskId, operatorId, 'TASK_ASSIGNED', undefined, `Assigned to user ${assigneeId}`)
    await createSystemNotification(assigneeId, `Resource assigned: ${task.title}`, 'TASK_ASSIGNED', `/tasks/${taskId}`)

    revalidatePath(`/tasks/${taskId}`)
    revalidatePath('/', 'layout')
    return { success: true, task }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function pauseTask(taskId: number, reason: string) {
  try {
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
      await createSystemNotification(task.reporterId, `Action Required: Task ${task.title} paused. Reason: ${reason}`, 'PAUSE_ALERT', `/tasks/${taskId}`)
    }

    revalidatePath(`/tasks/${taskId}`)
    revalidatePath('/', 'layout')
    return { success: true, task }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function advanceTaskStatus(taskId: number, newStatus: TaskStatus) {
  try {
    const session = await auth()
    const operatorId = Number(session?.user?.id)
    const oldTask = await prisma.task.findUnique({ where: { id: taskId } })
    if (!oldTask) throw new Error('Task not found')

    // STRICTURE: Only the person who initiated the task (reporter) can mark it as COMPLETED
    if (newStatus === TaskStatus.COMPLETED) {
      if (oldTask.reporterId !== operatorId && (session?.user as any).role !== 'ADMIN') {
        throw new Error('STRATEGIC DENIAL: Only the original initiator can finalize this directive.')
      }
    }

    const data: any = { status: newStatus }
    if (newStatus === TaskStatus.IN_PROGRESS && !oldTask?.startedAt) {
      data.startedAt = new Date()
    } else if (newStatus === TaskStatus.COMPLETED) {
      data.completedAt = new Date()
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data
    })

    if (session?.user?.id) {
      await createAuditLog(taskId, operatorId, 'STATUS_CHANGE', oldTask?.status, newStatus)
    }

    // LOGIC: When submitted for review, notify the reporter
    if (newStatus === TaskStatus.REVIEW && task.reporterId) {
      await createSystemNotification(
        task.reporterId,
        `Action Required: Task "${task.title}" has been submitted for review.`,
        'STATUS_REVIEW',
        `/tasks/${taskId}`
      )
      // Also notify watchers as before
      await notifyWatchers(taskId, `Task ready for review: ${task.title}`, 'STATUS_REVIEW', `/tasks/${taskId}`)
    }

    revalidatePath('/', 'layout')
    revalidatePath(`/tasks/${taskId}`)
    return { success: true, task }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
export async function updateTaskStatus(taskId: number, status: TaskStatus) {
  return advanceTaskStatus(taskId, status)
}

export async function checkAndNotifyBreaches() {
  const breachedTasks = await prisma.task.findMany({
    where: {
      status: { notIn: [TaskStatus.COMPLETED, TaskStatus.DISMISSED] },
      dueAt: { lt: new Date() },
    },
    include: {
      assignee: {
        include: {
          department: true
        }
      }
    }
  })

  for (const task of breachedTasks) {
    const headId = task.assignee?.department?.headId
    if (headId) {
      await createSystemNotification(headId, `BREACH ALERT: Directive #${task.id} has failed SLA compliance.`, 'BREACH_ALERT', `/tasks/${task.id}`)
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

  if (taskId) {
    await createAuditLog(taskId, authorId, 'COMMENT_ADDED', undefined, content.substring(0, 50))
    const task = await prisma.task.findUnique({ where: { id: taskId } })
    await notifyWatchers(taskId, `New comment: ${task?.title}`, 'COMMENT', `/tasks/${taskId}`)
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
  if (!session?.user?.id) throw new Error('Unauthorized')

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      departmentId,
      slaId: options?.dueAt ? 1 : (slaId || 1),
      assigneeId: assigneeId || null,
      description: options?.description || undefined,
      dueAt: options?.dueAt || undefined,
      isTicket: true,
      status: assigneeId ? TaskStatus.IN_PROGRESS : TaskStatus.PENDING
    }
  })

  if (assigneeId) {
    const operatorId = Number(session.user.id)
    await createAuditLog(taskId, operatorId, 'TICKET_ASSIGNED', undefined, `Assigned to user ${assigneeId}`)
    await performAutoWatcherLogic(taskId, assigneeId)
    await createSystemNotification(assigneeId, `New Ticket Assignment: ${task.title}`, 'TASK_ASSIGNED', `/tasks/${taskId}`)
  }

  // Notify the reporter that their brief is now in the pipeline
  if (task.reporterId) {
    await createSystemNotification(
      task.reporterId,
      `Brief in pipeline: "${task.title}" has been assigned and is being processed.`,
      'TASK_ASSIGNED',
      `/tasks/${taskId}`
    )
  }

  revalidatePath('/client-service/tickets')
  return task
}

export async function dismissTicket(taskId: number) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.DISMISSED }
  })
  revalidatePath('/client-service/tickets')
  return task
}
