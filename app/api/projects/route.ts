import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      include: { department: true }
    })

    if (user?.department?.name !== 'BUSINESS_DEVELOPMENT') {
      return NextResponse.json({ error: 'Forbidden: Only Business Development can initialize projects' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, slaName, slaDurationHrs, slaTier } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const project = await prisma.$transaction(async (tx) => {
      // 1. Create the SLA if details are provided
      let sla = null
      if (slaName && slaDurationHrs) {
        sla = await tx.sla.create({
          data: {
            name: slaName,
            durationHrs: parseInt(slaDurationHrs),
            tier: slaTier || 'STANDARD'
          }
        })
      }

      // 2. Create the project linked to the SLA
      return await tx.project.create({
        data: {
          title,
          description: description || null,
          defaultSlaId: sla?.id || null
        }
      })
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        tasks: {
          select: { status: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
