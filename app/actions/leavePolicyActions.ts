'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

// ─── Leave Policy CRUD ───

export async function getLeavePolicies() {
    return prisma.leavePolicy.findMany({
        orderBy: { roleCategory: 'asc' }
    })
}

export async function saveLeavePolicies(policies: { roleCategory: string, annualDays: number, sickDays: number, maternityDays: number, paternityDays: number }[]) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const role = (session.user as any).role
    if (role !== 'HR' && role !== 'ADMIN') throw new Error('Access denied')

    for (const p of policies) {
        await prisma.leavePolicy.upsert({
            where: { roleCategory: p.roleCategory },
            update: { annualDays: p.annualDays, sickDays: p.sickDays, maternityDays: p.maternityDays, paternityDays: p.paternityDays } as any,
            create: { roleCategory: p.roleCategory, annualDays: p.annualDays, sickDays: p.sickDays, maternityDays: p.maternityDays, paternityDays: p.paternityDays } as any
        })
    }

    revalidatePath('/hr/leave-policy')
    revalidatePath('/hr')
    return { success: true }
}

// ─── Leave Balance Calculation ───

function getRoleCategory(role: string): string {
    if (role === 'CEO') return 'CEO'
    if (['ADMIN', 'MANAGER', 'HR'].includes(role)) return 'MANAGER'
    return 'EMPLOYEE'
}

export async function getMyLeaveBalance() {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)
    const userRole = (session.user as any).role

    const category = getRoleCategory(userRole)

    // Get policy for this role category (fallback to defaults)
    const policy = await prisma.leavePolicy.findUnique({
        where: { roleCategory: category }
    })

    const annualAllocation = (policy as any)?.annualDays ?? 21
    const sickAllocation = (policy as any)?.sickDays ?? 10
    const maternityAllocation = (policy as any)?.maternityDays ?? 90
    const paternityAllocation = (policy as any)?.paternityDays ?? 14

    // Count approved leaves this calendar year
    const yearStart = new Date(new Date().getFullYear(), 0, 1)

    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
            userId,
            status: 'APPROVED',
            startDate: { gte: yearStart }
        },
        select: { type: true, startDate: true, endDate: true }
    })

    let annualUsed = 0
    let sickUsed = 0
    let maternityUsed = 0
    let paternityUsed = 0

    for (const leave of approvedLeaves) {
        const days = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        if (leave.type === 'SICK') {
            sickUsed += days
        } else if (leave.type === 'ANNUAL') {
            annualUsed += days
        } else if (leave.type === 'MATERNITY') {
            maternityUsed += days
        } else if (leave.type === 'PATERNITY') {
            paternityUsed += days
        }
    }

    return {
        annualAllocation,
        annualUsed,
        annualRemaining: annualAllocation - annualUsed,
        sickAllocation,
        sickUsed,
        sickRemaining: sickAllocation - sickUsed,
        maternityAllocation,
        maternityUsed,
        maternityRemaining: maternityAllocation - maternityUsed,
        paternityAllocation,
        paternityUsed,
        paternityRemaining: paternityAllocation - paternityUsed
    }
}
