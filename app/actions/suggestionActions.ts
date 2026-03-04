'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createSuggestion(data: {
    category: string
    content: string
}) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)

    const suggestion = await prisma.suggestion.create({
        data: {
            userId,
            category: data.category,
            content: data.content
        }
    })

    // Notify admin users
    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
    })

    for (const admin of admins) {
        await prisma.notification.create({
            data: {
                userId: admin.id,
                content: `New anonymous ${data.category.toLowerCase()} submitted`,
                type: 'SUGGESTION',
                link: '/hr/suggestions'
            }
        })
    }

    revalidatePath('/account')
    revalidatePath('/hr/suggestions')
    return suggestion
}

export async function getSuggestions(statusFilter?: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const role = (session.user as any).role
    if (role !== 'ADMIN' && role !== 'HR') {
        throw new Error('Only admin or HR can view suggestions')
    }

    const where: any = {}
    if (statusFilter && statusFilter !== 'ALL') {
        where.status = statusFilter
    }

    return prisma.suggestion.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function updateSuggestionStatus(id: number, status: string, adminNote?: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const role = (session.user as any).role
    if (role !== 'ADMIN' && role !== 'HR') {
        throw new Error('Only admin or HR can update suggestions')
    }

    const suggestion = await prisma.suggestion.update({
        where: { id },
        data: {
            status,
            adminNote: adminNote || null
        }
    })

    // Notify the user
    await prisma.notification.create({
        data: {
            userId: suggestion.userId,
            content: `Your ${suggestion.category.toLowerCase()} has been ${status.toLowerCase()}`,
            type: 'SUGGESTION_UPDATE',
            link: '/account'
        }
    })

    revalidatePath('/hr/suggestions')
    return suggestion
}

export async function getMySuggestions() {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)

    return prisma.suggestion.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    })
}
