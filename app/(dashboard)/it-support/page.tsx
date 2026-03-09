import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getITSupportRequests } from '@/app/actions/itSupportActions'
import ITSupportQueueClient from './ITSupportQueueClient'
import prisma from '@/lib/db'
import { Monitor, AlertCircle, Clock, CheckCircle2, Inbox } from 'lucide-react'

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
        <div className="space-y-8 pb-20 animate-fade-in-up">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden glass-panel rounded-3xl p-8 md:p-10 shadow-md">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-error/5 blur-[60px] rounded-full -ml-24 -mb-24" />
                <div className="relative flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary text-white rounded-3xl flex items-center justify-center shadow-ruby-soft shrink-0">
                        <Monitor className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-base-content mb-0">IT Support Queue</h1>
                        <p className="text-sm font-bold text-base-content/30 uppercase tracking-[0.2em] mt-1">Technical Support Management</p>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    {[
                        { label: 'Total', val: total, col: 'text-primary', ring: 'ring-primary/10', icon: Inbox },
                        { label: 'Open', val: open, col: 'text-warning', ring: 'ring-warning/10', icon: AlertCircle },
                        { label: 'In Progress', val: inProgress, col: 'text-info', ring: 'ring-info/10', icon: Clock },
                        { label: 'Resolved', val: resolved, col: 'text-success', ring: 'ring-success/10', icon: CheckCircle2 },
                    ].map((s, i) => (
                        <div key={i} className={`bg-base-100/50 backdrop-blur-sm rounded-2xl p-5 ring-1 ring-base-content/10 transition-all hover:scale-[1.03] shadow-md ${s.ring}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <s.icon className={`w-3.5 h-3.5 ${s.col} opacity-60`} />
                                <span className="text-xs uppercase font-black tracking-[0.3em] text-base-content/70">{s.label}</span>
                            </div>
                            <span className={`text-3xl font-black tracking-tighter ${s.col}`}>{s.val}</span>
                        </div>
                    ))}
                </div>
            </div>

            <ITSupportQueueClient
                initialRequests={JSON.parse(JSON.stringify(requests))}
                techUsers={techUsers}
            />
        </div>
    )
}
