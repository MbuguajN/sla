
'use server'

import prisma from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createStory(formData: { title: string, content: string, imageUrl?: string }) {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId) {
    throw new Error('Unauthorized deployment')
  }

  const story = await prisma.story.create({
    data: {
      title: formData.title,
      content: formData.content,
      imageUrl: formData.imageUrl || null,
      authorId: userId
    },
    include: {
      author: {
        select: { name: true }
      }
    }
  })

  revalidatePath('/')
  return story
}
