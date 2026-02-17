'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function pingPresence() {
    const session = await auth()
    const userId = Number(session?.user?.id)

    if (!userId) return { success: false }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { updatedAt: new Date() }
        })
        return { success: true }
    } catch (error) {
        console.error('Failed to update presence:', error)
        return { success: false }
    }
}
