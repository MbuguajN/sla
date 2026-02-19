import React from 'react'
import prisma from '@/lib/db'
import { Activity, AlertOctagon } from 'lucide-react'

export default async function OperationsStats({
    departmentId,
    isAdmin
}: {
    departmentId?: number;
    isAdmin?: boolean
}) {
    // Only filter for non-admins if a departmentId is provided
    const filter = (!isAdmin && departmentId) ? { departmentId } : {}

    const activeTasksCount = await prisma.task.count({
        where: {
            status: { not: 'COMPLETED' },
            ...filter
        }
    })

    const overdueTasksCount = await prisma.task.count({
        where: {
            status: { not: 'COMPLETED' },
            dueAt: { lt: new Date() },
            ...filter
        }
    })

    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Active Directives Card */}
            <div className="bg-base-100 border border-base-200 p-3 rounded-2xl shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all duration-300 h-[100px]">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="w-12 h-12 text-primary" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                            <Activity className="w-3 h-3" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Active</span>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-base-content tracking-tighter leading-none block">
                            {activeTasksCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* Critical Overdue Card */}
            <div className="bg-base-100 border border-base-200 p-3 rounded-2xl shadow-sm relative overflow-hidden group hover:border-error/20 transition-all duration-300 h-[100px]">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertOctagon className="w-12 h-12 text-error" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-error/10 rounded-lg text-error">
                            <AlertOctagon className="w-3 h-3" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Overdue</span>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-error tracking-tighter leading-none block">
                            {overdueTasksCount}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
