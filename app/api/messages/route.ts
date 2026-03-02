import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const projectId = searchParams.get('projectId')

    try {
        const where: any = {}
        if (taskId) where.taskId = Number(taskId)
        else if (projectId) where.projectId = Number(projectId)
        else return NextResponse.json({ messages: [] })

        const messages = await prisma.message.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { id: true, name: true } } }
        })

        return NextResponse.json({
            messages: messages.map((m: any) => ({
                id: m.id,
                authorId: m.authorId,
                authorName: m.author?.name || 'User',
                content: m.content,
                createdAt: m.createdAt?.toISOString()
            }))
        })
    } catch (error) {
        console.error('Failed to fetch messages:', error)
        return NextResponse.json({ messages: [] })
    }
}
