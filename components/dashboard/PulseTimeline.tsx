import React from 'react'
import prisma from '@/lib/db'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'

export default async function PulseTimeline() {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    const days = Array.from({ length: 14 }).map((_, i) => addDays(start, i))
    const end = days[days.length - 1]

    const tasks = await prisma.task.findMany({
        where: {
            status: { not: 'COMPLETED' },
            dueAt: { gte: start, lte: end }
        },
        select: {
            id: true,
            title: true,
            dueAt: true,
            project: { select: { title: true } }
        }
    })

    return (
        <div className="bg-base-100 border border-base-content/10 rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-base-content">2-Week Timeline</h3>
                <span className="text-xs text-base-content/70">{format(start, 'MMM d')} — {format(end, 'MMM d')}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {days.map((day) => {
                    const dayTasks = tasks.filter(t => t.dueAt && isSameDay(new Date(t.dueAt), day))
                    const count = dayTasks.length
                    const isCurrentDay = isToday(day)
                    const hasTasks = count > 0

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "group relative flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border min-w-[52px] cursor-default",
                                isCurrentDay
                                    ? "bg-primary text-primary-content border-primary"
                                    : "bg-base-100 border-base-200"
                            )}
                        >
                            <div className={cn(
                                "text-sm font-medium uppercase mb-0.5",
                                isCurrentDay ? "text-primary-content/70" : "text-base-content/70"
                            )}>
                                {format(day, 'EEE')}
                            </div>
                            <div className={cn(
                                "text-sm font-semibold leading-none",
                                isCurrentDay ? "text-primary-content" : "text-base-content"
                            )}>
                                {format(day, 'd')}
                            </div>

                            {hasTasks && (
                                <div className={cn(
                                    "mt-1.5 text-sm font-medium rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
                                    isCurrentDay ? "bg-primary-content/20 text-primary-content" : "bg-primary/10 text-primary"
                                )}>
                                    {count}
                                </div>
                            )}

                            {/* Tooltip */}
                            {hasTasks && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                                    <div className="bg-neutral text-neutral-content p-3 rounded-lg shadow-lg text-xs">
                                        <div className="font-medium mb-1.5 text-neutral-content/60 text-sm">
                                            {format(day, 'MMMM d')} · {count} task{count > 1 ? 's' : ''}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {dayTasks.slice(0, 3).map(t => (
                                                <div key={t.id} className="truncate text-sm">
                                                    <span className="text-primary mr-1">•</span>{t.title}
                                                </div>
                                            ))}
                                            {count > 3 && (
                                                <div className="text-sm text-neutral-content/40">
                                                    +{count - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
