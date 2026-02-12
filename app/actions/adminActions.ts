'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Middleware to check for Admin access
async function checkAdmin() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    throw new Error('Unauthorized Access: Admin privileges required.')
  }
}

// --- USER MANAGEMENT ---

export async function createUser(data: any) {
  await checkAdmin()
  
  const hashedPassword = await bcrypt.hash(data.password, 10)
  
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role as any,
      departmentId: Number(data.departmentId) || null
    } as any
  })
  
  revalidatePath('/admin/users')
  return user
}

export async function updateUser(userId: number, data: any) {
  await checkAdmin()

  const updateData: any = {
    name: data.name,
    email: data.email,
    role: data.role as any,
    departmentId: Number(data.departmentId) || null
  }

  // Only update password if provided
  if (data.password && data.password.trim() !== '') {
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData
  })

  revalidatePath('/admin/users')
  return user
}

export async function deleteUser(userId: number) {
  await checkAdmin()
  
  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/admin/users')
}

// --- DEPARTMENT MANAGEMENT ---

export async function createDepartment(name: string) {
  await checkAdmin()

  const dept = await prisma.department.create({
    data: { name: name.toUpperCase() }
  })

  revalidatePath('/admin/departments')
  return dept
}

export async function deleteDepartment(id: number) {
  try {
    await checkAdmin()

    await prisma.$transaction(async (tx) => {
      // 1. Unassign all users from this department
      await tx.user.updateMany({
        where: { departmentId: id },
        data: { departmentId: null }
      })

      // 2. Clear headId on the department itself (best effort to break loop)
      try {
        await tx.department.update({
             where: { id },
             data: { headId: null } as any
        })
      } catch (e) {
         // Proceed given deletion is the goal
      }

      // 3. Delete the department
      await tx.department.delete({ where: { id } })
    })

    revalidatePath('/admin/departments')
    return { success: true }
  } catch (error: any) {
    console.error('DELETE_DEPT_ERROR:', error)
    return { success: false, error: error.message || 'Failed to delete department' }
  }
}

export async function assignDepartmentHead(departmentId: number, userId: number) {
  await checkAdmin()

  // 1. Update the Department to link the head
  await prisma.department.update({
    where: { id: departmentId },
    data: { headId: userId } as any
  })

  // 2. Ensure the user has the DEPT_HEAD role
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'DEPT_HEAD' as any }
  })

  revalidatePath('/admin/departments')
}

// --- SLA MANAGEMENT ---

export async function updateSla(slaId: number, durationHrs: number) {
  await checkAdmin()

  await prisma.sla.update({
    where: { id: slaId },
    data: { durationHrs }
  })

  revalidatePath('/admin/sla')
}
