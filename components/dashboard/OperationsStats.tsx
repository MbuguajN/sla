import React from 'react'
import prisma from '@/lib/db'
import { Activity, AlertTriangle } from 'lucide-react'

export default async function OperationsStats({
    departmentId,
    isAdmin
}: {
    departmentId?: number;
    isAdmin?: boolean
}) {
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
            {/* Active Tasks */}
            <div className="bg-base-100 border border-base-200 rounded-xl p-5 flex flex-col justify-between min-h-[110px]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-base-content/50">Active Tasks</span>
                </div>
                <span className="text-3xl font-semibold text-base-content tracking-tight mt-3">
                    {activeTasksCount}
                </span>
            </div>

            {/* Overdue Tasks */}
            <div className="bg-base-100 border border-base-200 rounded-xl p-5 flex flex-col justify-between min-h-[110px]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-error/10 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-error" />
                    </div>
                    <span className="text-xs font-medium text-base-content/50">Overdue</span>
                </div>
                <span className="text-3xl font-semibold text-error tracking-tight mt-3">
                    {overdueTasksCount}
                </span>
            </div>
        </div>
    )
}
