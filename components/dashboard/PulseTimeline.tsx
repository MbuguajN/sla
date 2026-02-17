import React from 'react'
import prisma from '@/lib/db'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default async function PulseTimeline() {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 }) // Start on Monday
    const days = Array.from({ length: 14 }).map((_, i) => addDays(start, i))
    const end = days[days.length - 1]

    // Fetch tasks due in this range
    const tasks = await prisma.task.findMany({
        where: {
            status: { not: 'COMPLETED' },
            dueAt: {
                gte: start,
                lte: end
            }
        },
        select: {
            id: true,
            title: true,
            dueAt: true,
            project: { select: { title: true } }
        }
    })

    return (
        <div className="w-full overflow-x-auto pb-2 no-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
                {days.map((day) => {
                    const dayTasks = tasks.filter(t => t.dueAt && isSameDay(new Date(t.dueAt), day))
                    const count = dayTasks.length
                    const isCurrentDay = isToday(day)
                    const hasTasks = count > 0

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "group relative flex flex-col items-center justify-center p-3 rounded-xl border min-w-[60px] cursor-default transition-all duration-300",
                                isCurrentDay ? "bg-primary text-primary-content border-primary shadow-lg shadow-primary/20 scale-105" : "bg-base-100 border-base-200 hover:border-primary/50"
                            )}
                        >
                            <div className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">
                                {format(day, 'EEE')}
                            </div>
                            <div className={cn(
                                "text-lg font-black leading-none",
                                isCurrentDay ? "text-primary-content" : "text-base-content"
                            )}>
                                {format(day, 'd')}
                            </div>

                            {/* Blinking Counter / Indicator */}
                            {hasTasks && (
                                <div className="absolute top-1 right-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className={cn(
                                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                            isCurrentDay ? "bg-white" : "bg-primary"
                                        )}></span>
                                        <span className={cn(
                                            "relative inline-flex rounded-full h-2 w-2",
                                            isCurrentDay ? "bg-white" : "bg-primary"
                                        )}></span>
                                    </span>
                                </div>
                            )}

                            {/* Hover Card */}
                            {hasTasks && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-50">
                                    <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl text-xs relative">
                                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                        <div className="font-bold uppercase tracking-widest mb-2 border-b border-white/10 pb-1 text-[9px] text-white/60">
                                            {format(day, 'MMMM d')} • {count} Tasks
                                        </div>
                                        <div className="flex flex-col gap-1 max-h-[120px] overflow-hidden">
                                            {dayTasks.slice(0, 3).map(t => (
                                                <div key={t.id} className="truncate text-[10px]">
                                                    <span className="text-primary font-bold">●</span> {t.title}
                                                </div>
                                            ))}
                                            {count > 3 && (
                                                <div className="text-[9px] text-white/40 italic">
                                                    + {count - 3} more...
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
