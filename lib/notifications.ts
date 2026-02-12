
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

export async function createNotification(userId: number, content: string, type: NotificationType) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        content,
        type,
        isRead: false
      }
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

export async function notifyDepartmentHead(departmentId: number, content: string, type: NotificationType) {
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { headId: true, name: true }
  })
  
  if (dept?.headId) {
    console.log(`🔔 Notifying department head (${dept.name}, headId: ${dept.headId})`)
    await createNotification(dept.headId, content, type)
  } else {
    console.warn(`⚠️ NO DEPARTMENT HEAD FOUND for department ${departmentId}. Notification not sent: "${content.substring(0, 50)}"`)
  }
}
