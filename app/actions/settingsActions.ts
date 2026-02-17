'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function saveSystemSettings(settings: Record<string, string>) {
  try {
    const session = await auth()

    if (!session?.user) {
      return { success: false, error: 'Authentication session expired or invalid' }
    }

    const role = (session.user as any)?.role

    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized operational clearance' }
    }

    const kvEntries = Object.entries(settings);

    if (kvEntries.length > 0) {
      await Promise.all(
        kvEntries.map(([key, value]) =>
          (prisma.systemSettings as any).upsert({
            where: { key },
            update: { value },
            create: { key, value }
          })
        )
      )
    }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    console.error('CRITICAL ERROR in saveSystemSettings:', error);
    return { success: false, error: `CRITICAL ERROR: ${error.message || 'Unknown operational failure'}` }
  }
}

export async function getSystemSettings(keys: string[]) {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: {
        OR: [
          { key: { in: keys } },
          { key: { in: keys.map(k => k.toUpperCase()) } }
        ]
      }
    })

    const resultMap: Record<string, string> = {}
    keys.forEach(k => { resultMap[k] = '' });

    settings.forEach((s: any) => {
      resultMap[s.key] = s.value;
      resultMap[s.key.toLowerCase()] = s.value;
    })

    return resultMap
  } catch (error) {
    console.error('Error in getSystemSettings:', error);
    return {}
  }
}

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function uploadLogo(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user || ((session.user as any).role !== 'SUPER_ADMIN' && (session.user as any).role !== 'ADMIN')) {
      return { success: false, error: 'Unauthorized' }
    }

    const file = formData.get('file') as File
    const logoType = formData.get('type') as string || 'SYSTEM_LOGO'

    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    // Save file with type-specific name to avoid collisions
    const extension = file.name.split('.').pop() || 'png'
    const filename = `system-logo-${logoType.toLowerCase()}-${Date.now()}.${extension}`
    const filepath = join(uploadDir, filename)

    await writeFile(filepath, buffer)

    // Save path to DB
    const logoUrl = `/uploads/${filename}`
    await prisma.systemSettings.upsert({
      where: { key: logoType },
      update: { value: logoUrl },
      create: { key: logoType, value: logoUrl }
    })

    revalidatePath('/')
    return { success: true, url: logoUrl }
  } catch (error: any) {
    console.error('Upload error:', error)
    return { success: false, error: error.message }
  }
}
