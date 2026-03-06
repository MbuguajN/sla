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
        <div className="space-y-6 pb-20">
            {/* Clean Header */}
            <div className="flex items-end justify-between border-b border-base-content/5 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-warning font-bold uppercase tracking-wider text-xs opacity-70">
                        <CalendarOff className="w-3 h-3" />
                        Leave Management
                    </div>
                    <h1 className="text-4xl font-bold text-base-content tracking-tight leading-none">Leave Tracker</h1>
                </div>
                <div className="flex items-center gap-4">
                    {[
                        { label: 'Pending', val: pending, color: 'text-warning' },
                        { label: 'Approved', val: approved, color: 'text-success' },
                        { label: 'Denied', val: denied, color: 'text-error' },
                    ].map((s, i) => (
                        <div key={i} className="text-right">
                            <span className={`text-lg font-bold ${s.color}`}>{s.val}</span>
                            <span className="text-[9px] uppercase tracking-wider text-base-content/20 font-bold block">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <LeaveTrackerClient initialLeaves={JSON.parse(JSON.stringify(leaves))} userRole={role} />
        </div>
    )
}
