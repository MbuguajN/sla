'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

// ─── Create a Requisition with Line Items ───
export async function createRequisition(data: {
    items: { itemName: string; quantity: number; unitPrice: number; vatInclusive: boolean }[]
    reason?: string
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const userId = parseInt(session.user.id)

    if (!data.items || data.items.length === 0) {
        return { success: false, error: 'At least one item is required' }
    }

    // Calculate total
    const totalAmount = data.items.reduce((sum, item) => {
        const lineTotal = item.quantity * item.unitPrice
        return sum + (item.vatInclusive ? lineTotal : lineTotal * 1.16) // 16% VAT
    }, 0)

    try {
        const requisition = await prisma.requisition.create({
            data: {
                userId,
                reason: data.reason || null,
                totalAmount: Math.round(totalAmount * 100) / 100,
                items: {
                    create: data.items.map(item => ({
                        itemName: item.itemName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        vatInclusive: item.vatInclusive,
                    }))
                }
            },
            include: { items: true }
        })

        revalidatePath('/account')
        revalidatePath('/finance-pool')
        return { success: true, requisition }
    } catch (error: any) {
        console.error('Error creating requisition:', error)
        return { success: false, error: error.message || 'Failed to create requisition' }
    }
}

// ─── Get Current User's Requisitions ───
export async function getMyRequisitions() {
    const session = await auth()
    if (!session?.user?.id) return []

    const userId = parseInt(session.user.id)

    return prisma.requisition.findMany({
        where: { userId },
        include: {
            items: true,
            user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

// ─── Get All Requisitions (Finance/Admin) ───
export async function getAllRequisitions() {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const role = (session.user as any).role
    const departmentName = (session.user as any).department?.name
    const isFinance = role === 'FINANCE' || departmentName === 'FINANCE'

    if (!['ADMIN', 'CEO', 'SUPER_ADMIN'].includes(role) && !isFinance) {
        throw new Error('Access denied')
    }

    return prisma.requisition.findMany({
        include: {
            items: true,
            user: { select: { id: true, name: true, email: true, role: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

// ─── Get Requisitions Sent for CEO Review ───
export async function getCEORequisitions() {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const role = (session.user as any).role
    if (role !== 'CEO' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        throw new Error('Access denied')
    }

    return prisma.requisition.findMany({
        where: { status: 'SENT_FOR_REVIEW' },
        include: {
            items: true,
            user: { select: { id: true, name: true, email: true, role: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

// ─── Update Requisition Status (Finance/Admin actions) ───
export async function updateRequisitionStatus(
    id: number,
    status: 'DENIED' | 'SENT_FOR_REVIEW' | 'APPROVED',
    note?: string
) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const role = (session.user as any).role
    const departmentName = (session.user as any).department?.name
    const isFinance = role === 'FINANCE' || departmentName === 'FINANCE'

    if (!['ADMIN', 'CEO', 'SUPER_ADMIN'].includes(role) && !isFinance) {
        throw new Error('Access denied')
    }

    try {
        await prisma.requisition.update({
            where: { id },
            data: {
                status,
                reviewNote: note || null,
            }
        })

        revalidatePath('/finance-pool')
        revalidatePath('/executive-review')
        revalidatePath('/account')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating requisition status:', error)
        return { success: false, error: error.message || 'Failed to update status' }
    }
}
