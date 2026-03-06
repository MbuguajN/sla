'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function addProjectMember(projectId: number, userId: number, role: string = 'MEMBER') {
  try {
    await prisma.projectMember.create({
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
    await prisma.projectMember.delete({
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

export async function getEligibleUsers() {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: {
        select: { name: true }
      }
    },
    orderBy: { name: 'asc' }
  })
}
