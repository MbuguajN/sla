'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export async function updateProfile(data: { name?: string, password?: string, avatarUrl?: string }) {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId) throw new Error('Unauthorized')

  const updateData: any = {}
  if (data.name) updateData.name = data.name
  if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl
  
  if (data.password && data.password.trim() !== '') {
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData
  })

  revalidatePath('/', 'layout')
  return { success: true, user }
}
