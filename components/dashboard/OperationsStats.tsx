import React from 'react'
import prisma from '@/lib/db'
import { Activity, AlertTriangle, ArrowUpRight, TrendingDown } from 'lucide-react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { cn } from '@/lib/utils'

export default async function OperationsStats({
    userId,
    role,
    departmentId,
    isAdmin
}: {
    userId: number;
    role: string;
    departmentId?: number;
    isAdmin?: boolean
}) {
    // Logic:
    // 1. Admin/CEO/BusinessDev -> All stats (no filter)
    // 2. Manager -> Stats for their department
    // 3. Client Service -> Stats for tasks they initiated (reporterId)
    // 4. Employee -> Individual stats (assigneeId)

    let filter: any = {}

    const isBD = role === 'BUSINESS_DEVELOPMENT'
    const isCS = role === 'CLIENT_SERVICE'
    const isManager = role === 'MANAGER'

    if (isAdmin || isBD) {
        filter = {}
    } else if (isManager && departmentId) {
        filter = {
            OR: [
                { departmentId },
                { assignee: { departmentId: departmentId } }
            ]
        }
    } else if (isCS) {
        filter = { reporterId: userId }
    } else {
        // Default: Employee - individual stats only
        filter = { assigneeId: userId }
    }

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Active Tasks Card */}
            <GlowCard glowColor="blue" className="group">
                <div className="p-6 h-full flex flex-col justify-between relative overflow-hidden">
                    {/* Decorative Background Icon */}
                    <Activity className="absolute -right-6 -bottom-6 w-32 h-32 text-primary/5 -rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-0" />

                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <Activity className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-base-content/70">Active Tasks</h3>
                                <p className="text-sm text-base-content/30 uppercase tracking-[0.2em] font-black">Operations Pulse</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-base-content/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="w-4 h-4 text-primary" />
                        </div>
                    </div>

                    <div className="flex items-baseline gap-3 mt-auto">
                        <span className="text-5xl font-black tracking-tighter text-base-content group-hover:text-primary transition-colors">
                            {activeTasksCount}
                        </span>
                        <div className="flex items-center gap-1 text-sm font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                            <span>{Math.max(0, activeTasksCount - 2)} New</span>
                        </div>
                    </div>
                </div>
            </GlowCard>

            {/* Overdue Card */}
            <GlowCard glowColor="ruby" className="group">
                <div className="p-6 h-full flex flex-col justify-between relative overflow-hidden">
                    {/* Decorative Background Icon */}
                    <AlertTriangle className="absolute -right-6 -bottom-6 w-32 h-32 text-error/5 -rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-0" />

                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <AlertTriangle className="w-6 h-6 text-error" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-base-content/70">Overdue</h3>
                                <p className="text-sm text-base-content/30 uppercase tracking-[0.2em] font-black">Urgent Attention</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-base-content/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="w-4 h-4 text-error" />
                        </div>
                    </div>

                    <div className="flex items-baseline gap-3 mt-auto">
                        <span className={cn(
                            "text-5xl font-black tracking-tighter transition-colors",
                            overdueTasksCount > 0 ? "text-error" : "text-base-content/70"
                        )}>
                            {overdueTasksCount}
                        </span>
                        {overdueTasksCount > 0 && (
                            <div className="flex items-center gap-1 text-sm font-bold text-error bg-error/10 px-2 py-0.5 rounded-full">
                                <TrendingDown className="w-3 h-3" />
                                <span>Critical</span>
                            </div>
                        )}
                    </div>
                </div>
            </GlowCard>
        </div>
    )
}
