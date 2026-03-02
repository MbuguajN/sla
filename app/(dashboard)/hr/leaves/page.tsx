import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getLeaveRequests } from '@/app/actions/hrActions'
import LeaveTrackerClient from './LeaveTrackerClient'

export default async function LeaveTrackerPage() {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'HR' && role !== 'ADMIN' && role !== 'CEO') redirect('/')

    const leaves = await getLeaveRequests()

    return (
        <div className="space-y-8 pb-20 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold text-base-content tracking-tight">Leave Tracker</h1>
                <p className="text-sm text-base-content/40 mt-1">Manage employee leave requests</p>
            </div>
            <LeaveTrackerClient initialLeaves={JSON.parse(JSON.stringify(leaves))} userRole={role} />
        </div>
    )
}
