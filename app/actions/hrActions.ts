'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function getLeaveRequests(statusFilter?: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const role = (session.user as any).role
    if (role !== 'HR' && role !== 'ADMIN' && role !== 'CEO') {
        throw new Error('Access denied')
    }

    const where: any = {}
    if (statusFilter && statusFilter !== 'ALL') {
        where.status = statusFilter
    }

    return prisma.leaveRequest.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
            reviewer: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function createLeaveRequest(data: {
    type: string
    startDate: string
    endDate: string
    reason: string
}) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)

    const leave = await prisma.leaveRequest.create({
        data: {
            userId,
            type: data.type,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            reason: data.reason
        }
    })

    // Notify HR users
    const hrUsers = await prisma.user.findMany({
        where: { role: { in: ['HR', 'ADMIN'] } },
        select: { id: true }
    })

    const userName = session.user.name || 'An employee'
    for (const hr of hrUsers) {
        await prisma.notification.create({
            data: {
                userId: hr.id,
                content: `${userName} submitted a leave request (${data.type})`,
                type: 'LEAVE_REQUEST',
                link: '/hr/leaves'
            }
        })
    }

    revalidatePath('/account')
    revalidatePath('/hr/leaves')
    return leave
}

export async function reviewLeaveRequest(id: number, status: 'APPROVED' | 'DENIED', note?: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const role = (session.user as any).role
    if (role !== 'HR' && role !== 'ADMIN') {
        throw new Error('Only HR can review leave requests')
    }

    const reviewerId = Number(session.user.id)

    const leave = await prisma.leaveRequest.update({
        where: { id },
        data: {
            status,
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            reviewNote: note || null
        },
        include: { user: { select: { id: true, name: true } } }
    })

    // Notify the employee
    await prisma.notification.create({
        data: {
            userId: leave.userId,
            content: `Your leave request has been ${status.toLowerCase()}${note ? `: ${note}` : ''}`,
            type: 'LEAVE_REVIEW',
            link: '/account'
        }
    })

    revalidatePath('/hr/leaves')
    revalidatePath('/hr')
    return leave
}

export async function getMyLeaveRequests() {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)

    return prisma.leaveRequest.findMany({
        where: { userId },
        include: { reviewer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
    })
}

export async function getEmployeesOnLeave() {
    const now = new Date()
    return prisma.leaveRequest.findMany({
        where: {
            status: 'APPROVED',
            startDate: { lte: now },
            endDate: { gte: now }
        },
        include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, department: { select: { name: true } } } }
        }
    })
}

export async function getEmployeesOnPremise() {
    const now = new Date()

    // Get IDs of users currently on approved leave
    const onLeave = await prisma.leaveRequest.findMany({
        where: {
            status: 'APPROVED',
            startDate: { lte: now },
            endDate: { gte: now }
        },
        select: { userId: true }
    })
    const onLeaveIds = onLeave.map(l => l.userId)

    return prisma.user.findMany({
        where: {
            id: { notIn: onLeaveIds.length > 0 ? onLeaveIds : [-1] }
        },
        select: { id: true, name: true, email: true, avatarUrl: true, role: true, department: { select: { name: true } } },
        orderBy: { name: 'asc' }
    })
}

export async function getHRStats() {
    const now = new Date()

    const totalEmployees = await prisma.user.count()
    const pendingLeaves = await prisma.leaveRequest.count({ where: { status: 'PENDING' } })
    const onLeave = await prisma.leaveRequest.count({
        where: {
            status: 'APPROVED',
            startDate: { lte: now },
            endDate: { gte: now }
        }
    })
    const openSuggestions = await prisma.suggestion.count({ where: { status: 'OPEN' } })

    return { totalEmployees, pendingLeaves, onLeave, onPremise: totalEmployees - onLeave, openSuggestions }
}
