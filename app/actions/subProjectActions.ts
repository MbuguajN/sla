'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

// ─── Create a Sub-Project inside a Project ───
export async function createSubProject(data: {
    title: string
    description?: string
    projectId: number
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const userId = parseInt(session.user.id)
    const userDept = (session.user as any).departmentName
    const userRole = (session.user as any).role

    const canCreate = userDept === 'CLIENT_SERVICE' || userDept === 'BUSINESS_DEVELOPMENT' || userRole === 'ADMIN'
    if (!canCreate) {
        throw new Error('STRATEGIC DENIAL: Sub-project creation is restricted to Client Service and Business Development.')
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: data.projectId } })
    if (!project) throw new Error('Project not found')

    const subProject = await prisma.subProject.create({
        data: {
            title: data.title,
            description: data.description || null,
            projectId: data.projectId,
            createdById: userId,
        }
    })

    revalidatePath(`/projects/${data.projectId}`)
    return subProject
}

// ─── Create a Sublet inside a Sub-Project ───
export async function createSublet(data: {
    title: string
    description?: string
    parentId: number
    projectId: number
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const userId = parseInt(session.user.id)
    const userDept = (session.user as any).departmentName
    const userRole = (session.user as any).role

    const canCreate = userDept === 'CLIENT_SERVICE' || userDept === 'BUSINESS_DEVELOPMENT' || userRole === 'ADMIN'
    if (!canCreate) {
        throw new Error('STRATEGIC DENIAL: Sublet creation is restricted to Client Service and Business Development.')
    }

    // Verify parent sub-project exists and belongs to the project
    const parent = await prisma.subProject.findUnique({ where: { id: data.parentId } })
    if (!parent) throw new Error('Parent sub-project not found')
    if (parent.projectId !== data.projectId) throw new Error('Parent sub-project does not belong to the specified project')

    const sublet = await prisma.subProject.create({
        data: {
            title: data.title,
            description: data.description || null,
            projectId: data.projectId,
            parentId: data.parentId,
            createdById: userId,
        }
    })

    revalidatePath(`/projects/${data.projectId}`)
    revalidatePath(`/projects/${data.projectId}/sub/${data.parentId}`)
    return sublet
}

// ─── Update a Sub-Project / Sublet ───
export async function updateSubProject(id: number, data: {
    title?: string
    description?: string
    status?: string
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const userDept = (session.user as any).departmentName
    const userRole = (session.user as any).role

    const isCS = userDept === 'CLIENT_SERVICE' || userDept === 'CLIENT SERVICE'
    const isBD = userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT'
    const isAdmin = userRole === 'ADMIN' || userRole === 'CEO' || userRole === 'SUPER_ADMIN'

    if (data.status !== undefined) {
        if (!isCS && !isBD && !isAdmin) {
            throw new Error('STRATEGIC DENIAL: Lifecycle management of sub-projects is restricted to Client Service and Business Development.')
        }
    }

    const subProject = await prisma.subProject.update({
        where: { id },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.status !== undefined && { status: data.status }),
        }
    })

    revalidatePath(`/projects/${subProject.projectId}`)
    return subProject
}

// ─── Get all Sub-Projects for a Project (top-level only) ───
export async function getSubProjectsForProject(projectId: number) {
    return prisma.subProject.findMany({
        where: { projectId, parentId: null },
        include: {
            createdBy: { select: { id: true, name: true } },
            children: {
                include: {
                    _count: { select: { tasks: true } }
                }
            },
            _count: { select: { tasks: true, children: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

// ─── Get Sub-Project Detail ───
export async function getSubProjectDetail(subProjectId: number) {
    return prisma.subProject.findUnique({
        where: { id: subProjectId },
        include: {
            project: { select: { id: true, title: true } },
            parent: { select: { id: true, title: true } },
            createdBy: { select: { id: true, name: true } },
            children: {
                include: {
                    createdBy: { select: { id: true, name: true } },
                    _count: { select: { tasks: true } }
                },
                orderBy: { createdAt: 'desc' }
            },
            tasks: {
                include: {
                    assignee: { select: { id: true, name: true } },
                    sla: true
                },
                orderBy: { createdAt: 'desc' }
            },
            _count: { select: { tasks: true, children: true } }
        }
    })
}
