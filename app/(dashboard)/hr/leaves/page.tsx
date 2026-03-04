import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getLeaveRequests } from '@/app/actions/hrActions'
import LeaveTrackerClient from './LeaveTrackerClient'
import { CalendarOff, Clock, CheckCircle2, XCircle } from 'lucide-react'

export default async function LeaveTrackerPage() {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'HR' && role !== 'ADMIN' && role !== 'CEO') redirect('/')

    const leaves = await getLeaveRequests()

    const pending = leaves.filter((l: any) => l.status === 'PENDING').length
    const approved = leaves.filter((l: any) => l.status === 'APPROVED').length
    const denied = leaves.filter((l: any) => l.status === 'DENIED').length

    return (
        <div className="space-y-8 pb-20 animate-fade-in-up">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden glass-panel rounded-3xl p-8 md:p-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-warning/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 blur-[60px] rounded-full -ml-24 -mb-24" />
                <div className="relative flex items-center gap-6">
                    <div className="w-16 h-16 bg-warning text-white rounded-3xl flex items-center justify-center shadow-lg shrink-0">
                        <CalendarOff className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-base-content mb-0">Leave Tracker</h1>
                        <p className="text-[11px] font-bold text-base-content/30 uppercase tracking-[0.2em] mt-1">Manage Employee Leave Requests</p>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                    {[
                        { label: 'Pending', val: pending, col: 'text-warning', ring: 'ring-warning/10', icon: Clock },
                        { label: 'Approved', val: approved, col: 'text-success', ring: 'ring-success/10', icon: CheckCircle2 },
                        { label: 'Denied', val: denied, col: 'text-error', ring: 'ring-error/10', icon: XCircle },
                    ].map((s, i) => (
                        <div key={i} className={`bg-base-100/50 backdrop-blur-sm rounded-2xl p-5 ring-1 transition-all hover:scale-[1.03] ${s.ring}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <s.icon className={`w-3.5 h-3.5 ${s.col} opacity-60`} />
                                <span className="text-[9px] uppercase font-black tracking-[0.3em] text-base-content/20">{s.label}</span>
                            </div>
                            <span className={`text-3xl font-black tracking-tighter ${s.col}`}>{s.val}</span>
                        </div>
                    ))}
                </div>
            </div>

            <LeaveTrackerClient initialLeaves={JSON.parse(JSON.stringify(leaves))} userRole={role} />
        </div>
    )
}
