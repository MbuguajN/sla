import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getITSupportRequests } from '@/app/actions/itSupportActions'
import ITSupportQueueClient from './ITSupportQueueClient'
import prisma from '@/lib/db'
import { AlertTriangle, Clock, CheckCircle2, Ticket } from 'lucide-react'

export default async function ITSupportQueuePage() {
    const session = await auth()
    const user = session?.user as any
    if (!user) redirect('/login')

    const role = user.role

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

    const open = requests.filter((r: any) => r.status === 'OPEN').length
    const inProgress = requests.filter((r: any) => r.status === 'IN_PROGRESS').length
    const resolved = requests.filter((r: any) => r.status === 'RESOLVED').length
    const total = requests.length

    return (
        <div className="space-y-6 pb-20 animate-fade-in-up">
            {/* Simple Header */}
            <div className="bg-base-100/30 backdrop-blur-sm rounded-lg p-4 border border-base-content/5">
                <div className="space-y-3">
                    <h1 className="text-2xl font-bold text-base-content">IT Support Queue</h1>

                    {/* Clean KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: 'Total', val: total, icon: Ticket },
                            { label: 'Open', val: open, icon: AlertTriangle },
                            { label: 'Working', val: inProgress, icon: Clock },
                            { label: 'Resolved', val: resolved, icon: CheckCircle2 },
                        ].map((s, i) => (
                            <div key={i} className="bg-base-100/50 rounded-lg p-3 border border-base-content/5 transition-all hover:border-base-content/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <s.icon className="w-3 h-3 text-base-content/60" />
                                    <span className="text-[11px] font-semibold text-base-content/60 uppercase tracking-wide">
                                        {s.label}
                                    </span>
                                </div>
                                <span className="text-2xl font-bold text-base-content block">
                                    {s.val}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Queue Component */}
            <ITSupportQueueClient
                initialRequests={JSON.parse(JSON.stringify(requests))}
                techUsers={techUsers}
            />
        </div>
    )
}
