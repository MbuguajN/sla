import React from 'react'
import prisma from '@/lib/db'
import NewsBoard from '@/components/NewsBoard'

export default async function NewsSection() {
  const stories = await prisma.story.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 6
  })

  return <NewsBoard initialStories={stories as any} />
}

export function NewsSkeleton() {
  return (
    <div className="h-64 bg-base-200 border border-base-200 rounded-2xl animate-pulse" />
  )
}
