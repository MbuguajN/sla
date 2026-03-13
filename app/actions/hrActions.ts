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

    // Notify department head
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true, department: { select: { headId: true, name: true } } }
    })

    if (user?.department?.headId) {
        const startDate = new Date(data.startDate)
        const endDate = new Date(data.endDate)
        const dateRangeStr = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`

        await prisma.notification.create({
            data: {
                userId: user.department.headId,
                content: `Your team member ${userName} has requested ${data.type} leave from ${dateRangeStr}`,
                type: 'LEAVE_REQUEST_MANAGER',
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

export async function endLeaveEarly(id: number, actualEndDate: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)

    const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, department: true } } }
    })

    if (!leave) throw new Error('Leave not found')
    if (leave.status !== 'APPROVED') throw new Error('Only approved leaves can be ended early')
    if (leave.userId !== userId && (session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'HR') {
        throw new Error('Unauthorized')
    }

    const newEndDate = new Date(actualEndDate)

    const updated = await prisma.leaveRequest.update({
        where: { id },
        data: {
            endDate: newEndDate,
            status: 'ENDED_EARLY',
            endedEarlyAt: new Date()
        } as any
    })

    // Notify HR users
    const hrUsers = await prisma.user.findMany({
        where: { role: { in: ['HR', 'ADMIN'] } },
        select: { id: true }
    })

    const userName = leave.user.name || 'An employee'
    for (const hr of hrUsers) {
        await prisma.notification.create({
            data: {
                userId: hr.id,
                content: `${userName} has ended their ${leave.type} leave early on ${newEndDate.toLocaleDateString()}`,
                type: 'LEAVE_ENDED_EARLY',
                link: '/hr/leaves'
            }
        })
    }

    // Notify department head
    if (leave.user.department?.headId) {
        await prisma.notification.create({
            data: {
                userId: leave.user.department.headId,
                content: `${userName} from your team has ended their ${leave.type} leave early on ${newEndDate.toLocaleDateString()}`,
                type: 'LEAVE_ENDED_EARLY',
                link: '/hr/leaves'
            }
        })
    }

    revalidatePath('/account')
    revalidatePath('/hr/leaves')
    return updated
}

export async function cancelLeaveRequest(id: number, reason?: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)

    const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, department: true } } }
    })

    if (!leave) throw new Error('Leave not found')
    if (leave.status !== 'PENDING' && leave.status !== 'APPROVED') {
        throw new Error('Only pending or approved leaves can be cancelled')
    }
    if (leave.userId !== userId && (session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'HR') {
        throw new Error('Unauthorized')
    }

    const updated = await prisma.leaveRequest.update({
        where: { id },
        data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelledReason: reason || null
        } as any
    })

    // Only notify if it was approved
    if (leave.status === 'APPROVED') {
        // Notify HR users
        const hrUsers = await prisma.user.findMany({
            where: { role: { in: ['HR', 'ADMIN'] } },
            select: { id: true }
        })

        const userName = leave.user.name || 'An employee'
        for (const hr of hrUsers) {
            await prisma.notification.create({
                data: {
                    userId: hr.id,
                    content: `${userName} has cancelled their ${leave.type} leave${reason ? ` - Reason: ${reason}` : ''}`,
                    type: 'LEAVE_CANCELLED',
                    link: '/hr/leaves'
                }
            })
        }

        // Notify department head
        if (leave.user.department?.headId) {
            await prisma.notification.create({
                data: {
                    userId: leave.user.department.headId,
                    content: `${userName} from your team has cancelled their ${leave.type} leave${reason ? ` - Reason: ${reason}` : ''}`,
                    type: 'LEAVE_CANCELLED',
                    link: '/hr/leaves'
                }
            })
        }
    }

    revalidatePath('/account')
    revalidatePath('/hr/leaves')
    return updated
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
