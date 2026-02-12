import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic - never cache notification data
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = Number(session.user.id)

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 notifications
    })

    console.log(`📬 Fetched ${notifications.length} notifications for user ${userId}`)

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('❌ Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const body = await request.json()
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      })
      console.log(`✅ Marked all notifications as read for user ${userId}`)
    } else if (notificationId) {
      // Mark single notification as read
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
      })
      console.log(`✅ Marked notification ${notificationId} as read`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Failed to update notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = Number(session.user.id)

    await prisma.notification.deleteMany({
      where: { userId }
    })

    console.log(`🗑️ Purged all notifications for user ${userId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Failed to delete notifications:', error)
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
  }
}
