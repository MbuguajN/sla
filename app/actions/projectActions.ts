'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function addProjectMember(projectId: number, userId: number, role: string = 'MEMBER') {
  try {
    await (prisma as any).projectMember.create({
      data: {
        projectId,
        userId,
        role
      }
    })
    revalidatePath('/projects')
    return { success: true }
  } catch (error) {
    console.error('Error adding project member:', error)
    return { error: 'Failed to add member' }
  }
}

export async function removeProjectMember(projectId: number, userId: number) {
  try {
    await (prisma as any).projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    })
    revalidatePath('/projects')
    return { success: true }
  } catch (error) {
    console.error('Error removing project member:', error)
    return { error: 'Failed to remove member' }
  }
}

export async function updateProjectStatus(projectId: number, status: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const userDept = (session.user as any).departmentName
    const userRole = (session.user as any).role

    // Only Business Development can pause/close main projects
    const isBD = userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT'
    const isAdmin = userRole === 'ADMIN' || userRole === 'CEO' || userRole === 'SUPER_ADMIN'

    if (['PAUSED', 'CLOSED', 'ON_HOLD', 'COMPLETED'].includes(status.toUpperCase())) {
      if (!isBD && !isAdmin) {
        throw new Error('STRATEGIC DENIAL: Lifecycle termination or suspension of main projects is restricted to Business Development.')
      }
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status }
    })

    revalidatePath('/projects')
    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error updating project status:', error)
    return { error: error.message || 'Failed to update status' }
  }
}
