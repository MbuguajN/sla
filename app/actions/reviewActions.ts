'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

// ─── Review Cycle Management (HR only) ───

export async function createReviewCycle(data: {
    title: string
    expiresAt: string
    managerQuestions: string[]
    employeeQuestions: string[]
}) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const role = (session.user as any).role
    if (role !== 'HR' && role !== 'ADMIN') throw new Error('Only HR can create review cycles')

    // Close any existing active cycle
    await prisma.reviewCycle.updateMany({
        where: { status: 'ACTIVE' },
        data: { status: 'CLOSED' }
    })

    const cycle = await prisma.reviewCycle.create({
        data: {
            title: data.title,
            expiresAt: new Date(data.expiresAt),
            questions: {
                create: [
                    ...data.managerQuestions.map(text => ({ text, targetType: 'EMPLOYEE' })),
                    ...data.employeeQuestions.map(text => ({ text, targetType: 'MANAGER' })),
                ]
            }
        },
        include: { questions: true }
    })

    revalidatePath('/hr/reviews')
    revalidatePath('/reviews')
    return cycle
}

export async function getActiveReviewCycle() {
    return prisma.reviewCycle.findFirst({
        where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
        include: {
            questions: true,
            _count: { select: { responses: true } }
        }
    })
}

export async function getAllReviewCycles() {
    return prisma.reviewCycle.findMany({
        include: {
            questions: true,
            _count: { select: { responses: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function closeReviewCycle(cycleId: number) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const role = (session.user as any).role
    if (role !== 'HR' && role !== 'ADMIN') throw new Error('Access denied')

    await prisma.reviewCycle.update({
        where: { id: cycleId },
        data: { status: 'CLOSED' }
    })

    revalidatePath('/hr/reviews')
    revalidatePath('/reviews')
    return { success: true }
}

// ─── Review Assignments & Submission ───

export async function getReviewAssignments() {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const userId = Number(session.user.id)
    const userRole = (session.user as any).role

    const cycle = await getActiveReviewCycle()
    if (!cycle) return { cycle: null, reviewees: [], questions: [], completedIds: [] }

    // Find current user's department
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: true, headedDepartment: true }
    })

    if (!user) throw new Error('User not found')

    const isManager = !!user.headedDepartment
    let reviewees: any[] = []
    let questions: any[] = []

    if (isManager) {
        // Manager rates employees in their department
        reviewees = await prisma.user.findMany({
            where: {
                departmentId: user.headedDepartment!.id,
                id: { not: userId }
            },
            select: { id: true, name: true, avatarUrl: true, role: true }
        })
        questions = cycle.questions.filter(q => q.targetType === 'EMPLOYEE')
    } else {
        // Employee rates their manager
        if (user.departmentId) {
            const dept = await prisma.department.findUnique({
                where: { id: user.departmentId },
                include: { head: { select: { id: true, name: true, avatarUrl: true, role: true } } }
            })
            if (dept?.head && dept.head.id !== userId) {
                reviewees = [dept.head]
            }
        }
        questions = cycle.questions.filter(q => q.targetType === 'MANAGER')
    }

    // Get already completed reviews
    const completed = await prisma.reviewResponse.findMany({
        where: { cycleId: cycle.id, reviewerId: userId },
        select: { revieweeId: true }
    })
    const completedIds = [...new Set(completed.map(c => c.revieweeId))]

    return {
        cycle: { id: cycle.id, title: cycle.title, expiresAt: cycle.expiresAt },
        reviewees,
        questions,
        completedIds
    }
}

export async function submitReview(cycleId: number, revieweeId: number, ratings: { questionId: number, rating: number }[]) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const reviewerId = Number(session.user.id)

    // Validate cycle is active
    const cycle = await prisma.reviewCycle.findFirst({
        where: { id: cycleId, status: 'ACTIVE', expiresAt: { gt: new Date() } }
    })
    if (!cycle) throw new Error('Review cycle is not active or has expired')

    // Create all responses
    for (const r of ratings) {
        await prisma.reviewResponse.upsert({
            where: {
                cycleId_questionId_reviewerId_revieweeId: {
                    cycleId, questionId: r.questionId, reviewerId, revieweeId
                }
            },
            update: { rating: r.rating },
            create: {
                cycleId,
                questionId: r.questionId,
                reviewerId,
                revieweeId,
                rating: r.rating
            }
        })
    }

    revalidatePath('/reviews')
    return { success: true }
}

// ─── Review Results (HR only) ───

export async function getReviewResults(cycleId: number) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const role = (session.user as any).role
    if (role !== 'HR' && role !== 'ADMIN') throw new Error('Access denied')

    const responses = await prisma.reviewResponse.findMany({
        where: { cycleId },
        include: {
            question: true,
            cycle: true,
            reviewer: { select: { name: true } }
        }
    })

    // Get unique reviewee IDs and fetch their info
    const revieweeIds = [...new Set(responses.map(r => r.revieweeId))]
    const reviewees = await prisma.user.findMany({
        where: { id: { in: revieweeIds } },
        select: { id: true, name: true, role: true, department: { select: { name: true } } }
    })

    // Aggregate: average rating per reviewee
    const results = reviewees.map(user => {
        const userResponses = responses.filter(r => r.revieweeId === user.id)
        const totalScore = userResponses.reduce((sum, r) => sum + r.rating, 0)
        const avgRating = userResponses.length > 0
            ? totalScore / userResponses.length
            : 0
        return {
            ...user,
            totalScore,
            avgRating: Math.round(avgRating * 10) / 10,
            totalResponses: userResponses.length,
            questionBreakdown: userResponses.reduce((acc: any[], r) => {
                const existing = acc.find(a => a.questionId === r.questionId)
                if (existing) {
                    existing.ratings.push({ reviewer: r.reviewer.name, value: r.rating })
                    existing.avg = existing.ratings.reduce((s: number, v: any) => s + v.value, 0) / existing.ratings.length
                } else {
                    acc.push({
                        questionId: r.questionId,
                        questionText: r.question.text,
                        ratings: [{ reviewer: r.reviewer.name, value: r.rating }],
                        avg: r.rating
                    })
                }
                return acc
            }, [])
        }
    })

    return results.sort((a, b) => b.avgRating - a.avgRating) as any
}
