'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function getNotifications() {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

        const notifications = await prisma.notification.findMany({
            where: {
                userId: Number(session.user.id),
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        })

        const unreadCount = await prisma.notification.count({
            where: {
                userId: Number(session.user.id),
                isRead: false,
            }
        })

        return { success: true, notifications, unreadCount }
    } catch (error: any) {
        console.error('Error fetching notifications:', error)
        return { success: false, error: error.message }
    }
}

export async function markAsRead(id: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error('Unauthorized')

        await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        })

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        console.error('Error marking notification as read:', error)
        return { success: false, error: error.message }
    }
}

export async function markAllAsRead() {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error('Unauthorized')

        await prisma.notification.updateMany({
            where: {
                userId: Number(session.user.id),
                isRead: false
            },
            data: { isRead: true }
        })

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        console.error('Error marking all notifications as read:', error)
        return { success: false, error: error.message }
    }
}
