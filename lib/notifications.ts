
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
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: {
      headId: true,
      name: true,
      head: { select: { role: true } }
    }
  })

  if (dept?.headId) {
    // Skip admin/system users — they should only get system-level alerts, not department-level
    if (dept.head?.role === 'ADMIN' || dept.head?.role === 'SYSTEM') {
      console.log(`⏭️ Skipping department notification for admin/system head (${dept.name}, headId: ${dept.headId})`)
      return
    }
    console.log(`🔔 Notifying department head (${dept.name}, headId: ${dept.headId})`)
    await createNotification(dept.headId, content, type, link)
  } else {
    console.warn(`⚠️ NO DEPARTMENT HEAD FOUND for department ${departmentId}. Notification not sent: "${content.substring(0, 50)}"`)
  }
}
