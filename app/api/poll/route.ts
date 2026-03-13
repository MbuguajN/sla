import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = Number(session.user.id)

    const [latestNotification, latestTask] = await Promise.all([
      prisma.notification.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }),
      prisma.task.findFirst({
        where: {
          OR: [
            { assigneeId: userId },
            { reporterId: userId },
            { watchers: { some: { userId } } }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      })
    ])

    const latestTimestamp = Math.max(
      latestNotification?.createdAt?.getTime() || 0,
      latestTask?.updatedAt?.getTime() || 0
    )

    return NextResponse.json({ version: latestTimestamp })
  } catch {
    return NextResponse.json({ version: 0 })
  }
}
