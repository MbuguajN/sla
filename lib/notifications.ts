
import prisma from './db'

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'MESSAGE_RECEIVED'
  | 'DEPT_MESSAGE'
  | 'PROJECT_ADDED'
  | 'BREACH_ALERT'
  | 'PAUSE_ALERT'
  | 'COMMENT'
  | 'STATUS_REVIEW'
  | 'AUTO_WATCHER'
  | 'WATCHER'
  | 'ASSIGNMENT'

export async function createNotification(userId: number, content: string, type: NotificationType, link?: string) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        content,
        type,
        isRead: false,
        link: link as any
      } as any
    })

    console.log('🔔 NOTIFICATION TRIGGERED:', {
      userId,
      type,
      message: content.substring(0, 50),
      notificationId: notification.id
    })

    return notification
  } catch (error) {
    console.error("❌ Failed to create notification:", error)
    return null
  }
}

export async function notifyDepartmentHead(departmentId: number, content: string, type: NotificationType, link?: string) {
  // 1. Get the department head
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: {
      headId: true,
      name: true,
      head: { select: { role: true } }
    }
  })

  // 2. Get all managers in the department
  const managers = await prisma.user.findMany({
    where: {
      departmentId: departmentId,
      role: 'MANAGER',
      NOT: { id: dept?.headId || undefined } // Don't duplicate if head is already a manager
    },
    select: { id: true }
  })

  const recipients = new Set<number>()

  // Add head if not admin/system
  if (dept?.headId && dept.head?.role !== 'ADMIN' && dept.head?.role !== 'SYSTEM') {
    recipients.add(dept.headId)
  }

  // Add all managers
  managers.forEach(m => recipients.add(m.id))

  if (recipients.size > 0) {
    console.log(`🔔 Notifying ${recipients.size} recipients for department ${dept?.name || departmentId}`)
    await Promise.all(
      Array.from(recipients).map(userId => createNotification(userId, content, type, link))
    )
  } else {
    console.warn(`⚠️ NO RECIPIENTS FOUND for department ${departmentId}. Notification not sent: "${content.substring(0, 50)}"`)
  }
}
