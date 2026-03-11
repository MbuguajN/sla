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
  slaId?: number
  assigneeId?: number
  departmentId: number
  watcherIds?: number[]
  dueAt: Date
  projectId?: number
  subProjectId?: number
  isTicket?: boolean
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')
    const operatorId = parseInt(session.user.id)

    // STRICTURE: Only BDev can create briefs (tasks without a project)
    // Client Service can initialize tasks but only within specific projects
    const userDept = (session.user as any).departmentName
    const isBD = userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT'
    const isCS = userDept === 'CLIENT_SERVICE' || userDept === 'CLIENT SERVICE'

    if (!isBD && !isCS) {
      throw new Error('STRATEGIC DENIAL: Directive initiation is restricted to Business Development and Client Service departments. Unauthorized role extension detected.')
    }

    let projectId = data.projectId

    if (projectId && !data.subProjectId) {
      throw new Error('STRATEGIC DENIAL: Main projects cannot contain direct tasks. Link this brief to a sub-project or sublet.')
    }

    if (data.subProjectId) {
      const subProject = await prisma.subProject.findUnique({
        where: { id: data.subProjectId },
        select: { id: true, projectId: true }
      })

      if (!subProject) {
        throw new Error('STRATEGIC DENIAL: Linked sub-project context is invalid.')
      }

      if (projectId && subProject.projectId !== projectId) {
        throw new Error('STRATEGIC DENIAL: Linked project and sub-project context do not align.')
      }

      projectId = subProject.projectId
    }

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true }
      })

      if (!project) {
        throw new Error('STRATEGIC DENIAL: Linked project context is invalid.')
      }
    }


    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        slaId: data.slaId ?? undefined,
        assigneeId: data.assigneeId,
        departmentId: data.departmentId,
        projectId,
        subProjectId: data.subProjectId,
        isTicket: data.isTicket ?? true,
        reporterId: operatorId,
        dueAt: data.dueAt,
        status: 'PENDING',
        watchers: data.watcherIds && data.watcherIds.length > 0 ? {
          create: data.watcherIds.map(userId => ({ userId }))
        } : undefined
      } as any
    })

    // RECORD AUDIT
    await createAuditLog(task.id, operatorId, 'TASK_CREATED', undefined, task.title)

    // Notify Department Head with a link to the Brief Hub (Ticket Pipeline)
    await notifyDepartmentHead(
      data.departmentId,
      `New Brief Assigned: ${data.title}`,
      'TASK_ASSIGNED',
      `/client-service/tickets`
    )

    revalidatePath('/', 'layout')
    revalidatePath('/tasks')
    if (projectId) {
      revalidatePath(`/projects/${projectId}`)
    }
    if (projectId && data.subProjectId) {
      revalidatePath(`/projects/${projectId}/sub/${data.subProjectId}`)
    }
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
    const operatorRole = (session?.user as any)?.role
    const operatorDept = (session?.user as any)?.departmentName
    const operatorDeptId = Number((session?.user as any)?.departmentId)

    const isCS = operatorDept === 'CLIENT_SERVICE' || operatorDept === 'CLIENT SERVICE'
    const isBD = operatorDept === 'BUSINESS_DEVELOPMENT' || operatorDept === 'BUSINESS DEVELOPMENT'

    if (!operatorId) throw new Error('Unauthorized')

    if ((isCS || isBD) || (operatorRole !== 'MANAGER' && operatorRole !== 'ADMIN' && operatorRole !== 'CEO' && operatorRole !== 'HR')) {
      throw new Error('STRATEGIC DENIAL: Resource allocation is restricted to management personnel outside of the initiation departments.')
    }

    const oldTask = await prisma.task.findUnique({ where: { id: taskId } })
    if (!oldTask) throw new Error('Task not found')

    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, departmentId: true }
    })
    if (!assignee) throw new Error('STRATEGIC DENIAL: Selected assignee does not exist.')

    if (operatorRole === 'MANAGER') {
      if (!operatorDeptId) {
        throw new Error('STRATEGIC DENIAL: Manager context missing department scope.')
      }
      if (oldTask.departmentId && oldTask.departmentId !== operatorDeptId) {
        throw new Error('STRATEGIC DENIAL: Managers may only allocate directives within their own department queue.')
      }
      if (assigneeId !== operatorId && assignee.departmentId !== operatorDeptId) {
        throw new Error('STRATEGIC DENIAL: Managers may assign directives only to themselves or members of their department.')
      }
    }

    if (oldTask?.status === TaskStatus.COMPLETED) {
      throw new Error('STRATEGIC DENIAL: Cannot reassign a finalized directive.')
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeId,
        status: TaskStatus.PENDING,
        startedAt: null,
        pauseReason: null
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

    if ([TaskStatus.RECEIVED, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW].includes(newStatus)) {
      if (!oldTask.assigneeId || oldTask.assigneeId !== operatorId) {
        throw new Error('STRATEGIC DENIAL: Only the assigned handler may receive, start, or submit this directive for review.')
      }
    }

    // STRICTURE: Only the person who initiated the task (reporter) can mark it as COMPLETED
    if (newStatus === TaskStatus.COMPLETED) {
      if (oldTask.reporterId !== operatorId) {
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

export async function sendMessage(taskId: number | null, authorId: number, content: string, projectId?: number | null, subProjectId?: number | null) {
  const msg = await prisma.message.create({
    data: {
      taskId: taskId || undefined,
      authorId,
      content,
      projectId: projectId || undefined,
      subProjectId: subProjectId || undefined,
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
  const operatorId = Number(session.user.id)
  const operatorRole = (session?.user as any)?.role
  const operatorDept = (session?.user as any)?.departmentName
  const operatorDeptId = Number((session?.user as any)?.departmentId)

  const isCS = operatorDept === 'CLIENT_SERVICE' || operatorDept === 'CLIENT SERVICE'
  const isBD = operatorDept === 'BUSINESS_DEVELOPMENT' || operatorDept === 'BUSINESS DEVELOPMENT'

  if ((isCS || isBD) || (operatorRole !== 'MANAGER' && operatorRole !== 'ADMIN' && operatorRole !== 'CEO' && operatorRole !== 'HR')) {
    throw new Error('STRATEGIC DENIAL: Resource allocation and brief processing is restricted to management personnel outside of the initiation departments.')
  }

  if (operatorRole === 'MANAGER') {
    if (!operatorDeptId || departmentId !== operatorDeptId) {
      throw new Error('STRATEGIC DENIAL: Managers may only route briefs into their own department queue.')
    }
  }

  if (assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, departmentId: true }
    })
    if (!assignee) {
      throw new Error('STRATEGIC DENIAL: Selected assignee does not exist.')
    }
    if (operatorRole === 'MANAGER' && assigneeId !== operatorId && assignee.departmentId !== operatorDeptId) {
      throw new Error('STRATEGIC DENIAL: Managers may assign briefs only to themselves or members of their department.')
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      departmentId,
      slaId: options?.dueAt ? 1 : (slaId || 1),
      assigneeId: assigneeId || null,
      description: options?.description || undefined,
      dueAt: options?.dueAt || undefined,
      isTicket: true,
      status: TaskStatus.PENDING,
      startedAt: null,
      pauseReason: null
    }
  })

  if (assigneeId) {
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
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const operatorId = Number(session.user.id)
  const operatorRole = (session?.user as any)?.role

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) throw new Error('STRATEGIC DENIAL: Directive not found.')

  // STRICTURE 1: Only Incoming stage (PENDING or RECEIVED)
  if (task.status !== 'PENDING' && task.status !== 'RECEIVED') {
    throw new Error('STRATEGIC DENIAL: Operational dismissal is restricted to the incoming stage.')
  }

  // STRICTURE 2: Only the original initiator (reporter) can dismiss
  if (task.reporterId !== operatorId && operatorRole !== 'ADMIN') {
    throw new Error('STRATEGIC DENIAL: Operational dismissal is restricted to the original initiator.')
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.DISMISSED }
  })

  await createAuditLog(taskId, operatorId, 'TICKET_DISMISSED', task.status, 'DISMISSED')

  revalidatePath('/client-service/tickets')
  return updatedTask
}

export async function getTasksForDashboard() {
  const session = await auth()
  const role = (session?.user as any)?.role
  const deptName = (session?.user as any)?.departmentName

  const isCS = deptName === 'CLIENT_SERVICE' || deptName === 'CLIENT SERVICE'
  const isCEO = role === 'CEO'
  const isHR = role === 'HR'
  const isManager = role === 'MANAGER' || isCEO || isHR
  const isBusinessDev = deptName === 'BUSINESS_DEVELOPMENT'
  const isAdmin = role === 'ADMIN'

  if (!isAdmin && !isManager && !isCS && !isBusinessDev && !isCEO && !isHR) {
    return []
  }

  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      createdAt: true,
      assigneeId: true,
      reporterId: true,
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

  return tasks
}
