import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getITSupportRequests } from '@/app/actions/itSupportActions'
import ITSupportQueueClient from './ITSupportQueueClient'
import prisma from '@/lib/db'

export default async function ITSupportQueuePage() {
    const session = await auth()
    const user = session?.user as any
    if (!user) redirect('/login')

    const role = user.role
    const deptName = user.departmentName // Injected in session or we can fetch it

    // Re-verify department if needed, but the action will also verify
    const dbUser = await prisma.user.findUnique({
        where: { id: Number(user.id) },
        include: { department: true }
    })

    if (role !== 'ADMIN' && dbUser?.department?.name !== 'TECHNOLOGY') {
        redirect('/')
    }

    const requests = await getITSupportRequests()
    const techUsers = await prisma.user.findMany({
        where: { department: { name: 'TECHNOLOGY' } },
        select: { id: true, name: true }
    })

    return (
        <div className="space-y-8 pb-20 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold text-base-content tracking-tight">IT Support Queue</h1>
                <p className="text-sm text-base-content/40 mt-1">Manage technical support requests across the organization</p>
            </div>
            <ITSupportQueueClient
                initialRequests={JSON.parse(JSON.stringify(requests))}
                techUsers={techUsers}
            />
        </div>
    )
}
