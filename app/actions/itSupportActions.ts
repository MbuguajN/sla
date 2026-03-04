'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createITSupportRequest(data: {
    title: string
    description: string
    priority: string
}) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)

    const request = await prisma.iTSupportRequest.create({
        data: {
            userId,
            title: data.title,
            description: data.description,
            priority: data.priority
        }
    })

    // Notify all TECHNOLOGY department users
    const techDept = await prisma.department.findFirst({
        where: { name: 'TECHNOLOGY' },
        include: { users: { select: { id: true } } }
    })

    if (techDept) {
        const userName = session.user.name || 'A user'
        for (const tech of techDept.users) {
            await prisma.notification.create({
                data: {
                    userId: tech.id,
                    content: `New IT support request: ${data.title} (${data.priority})`,
                    type: 'IT_SUPPORT',
                    link: '/it-support'
                }
            })
        }
    }

    revalidatePath('/account')
    return request
}

export async function getITSupportRequests(statusFilter?: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const role = (session.user as any).role
    const deptName = (session.user as any).departmentName

    // Only TECHNOLOGY dept + ADMIN can view all
    if (role !== 'ADMIN' && deptName !== 'TECHNOLOGY') {
        throw new Error('Access denied')
    }

    const where: any = {}
    if (statusFilter && statusFilter !== 'ALL') {
        where.status = statusFilter
    }

    return prisma.iTSupportRequest.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
            assignedTo: { select: { id: true, name: true } },
            resolvedBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function assignITRequest(id: number, assigneeId: number) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const request = await prisma.iTSupportRequest.update({
        where: { id },
        data: {
            assignedToId: assigneeId,
            status: 'IN_PROGRESS'
        }
    })

    // Notify the assignee
    await prisma.notification.create({
        data: {
            userId: assigneeId,
            content: `You have been assigned an IT support request: ${request.title}`,
            type: 'IT_ASSIGNED',
            link: '/it-support'
        }
    })

    revalidatePath('/account')
    return request
}

export async function resolveITRequest(id: number) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)

    const request = await prisma.iTSupportRequest.update({
        where: { id },
        data: {
            status: 'RESOLVED',
            resolvedById: userId,
            resolvedAt: new Date()
        }
    })

    // Notify the requestor
    await prisma.notification.create({
        data: {
            userId: request.userId,
            content: `Your IT support request "${request.title}" has been resolved`,
            type: 'IT_RESOLVED',
            link: '/account'
        }
    })

    revalidatePath('/account')
    return request
}

export async function getMyITRequests() {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)

    return prisma.iTSupportRequest.findMany({
        where: { userId },
        include: {
            assignedTo: { select: { name: true } },
            resolvedBy: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}
