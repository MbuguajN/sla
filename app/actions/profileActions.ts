'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

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

export async function uploadAvatar(formData: FormData) {
  const session = await auth()
  const userId = Number(session?.user?.id)
  if (!userId) return { success: false, error: 'Unauthorized' }

  const file = formData.get('file') as File
  if (!file) return { success: false, error: 'No file' }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split('.').pop() || 'png'
    const filename = `avatar-${userId}-${Date.now()}.${ext}`
    await writeFile(join(uploadDir, filename), buffer)

    const avatarUrl = `/uploads/avatars/${filename}`
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    })

    revalidatePath('/', 'layout')
    return { success: true, url: avatarUrl }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getMyProfile() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true, avatarUrl: true,
      lastActiveAt: true, createdAt: true,
      department: { select: { name: true } }
    }
  })
}

