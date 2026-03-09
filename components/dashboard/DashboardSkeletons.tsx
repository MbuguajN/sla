import React from 'react'
import { cn } from '@/lib/utils'

export function OperationsStatsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
                <div key={i} className="h-40 bg-base-100 border border-base-content/5 rounded-3xl p-6 relative overflow-hidden animate-pulse">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-base-content/5 rounded-2xl" />
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-base-content/5 rounded-md" />
                            <div className="h-3 w-32 bg-base-content/5 rounded-md" />
                        </div>
                    </div>
                    <div className="h-12 w-20 bg-base-content/10 rounded-xl" />
                </div>
            ))}
        </div>
    )
}

export function PulseTimelineSkeleton() {
    return (
        <div className="bg-base-100 border border-base-content/10 rounded-xl p-5 shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-32 bg-base-content/5 rounded" />
                <div className="h-3 w-24 bg-base-content/5 rounded" />
            </div>
            <div className="flex items-center gap-1.5 overflow-hidden pb-1">
                {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border border-base-200 min-w-[52px] bg-base-100 space-y-2">
                        <div className="h-3 w-8 bg-base-content/5 rounded" />
                        <div className="h-4 w-4 bg-base-content/5 rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function GlobalTaskTableSkeleton() {
    return (
        <div className="bg-base-100 border border-base-content/10 rounded-xl shadow-sm animate-pulse overflow-hidden">
            <div className="px-6 py-5 border-b border-base-200 flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-5 w-32 bg-base-content/5 rounded" />
                    <div className="h-4 w-48 bg-base-content/5 rounded" />
                </div>
                <div className="h-9 w-60 bg-base-content/5 rounded-lg" />
            </div>
            <div className="p-0">
                <div className="h-10 bg-base-200/50 w-full mb-1" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-base-100">
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-[60%] bg-base-content/5 rounded" />
                            <div className="h-3 w-[20%] bg-base-content/5 rounded" />
                        </div>
                        <div className="w-32 h-4 bg-base-content/5 rounded" />
                        <div className="w-24 h-4 bg-base-content/5 rounded" />
                        <div className="w-20 h-4 bg-base-content/5 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function ProjectsGridSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-base-content/5 rounded" />
                <div className="h-4 w-20 bg-base-content/5 rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-base-100 border border-base-content/10 p-5 rounded-xl space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="w-9 h-9 bg-base-content/5 rounded-lg" />
                            <div className="h-3 w-10 bg-base-content/5 rounded" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-[80%] bg-base-content/10 rounded" />
                            <div className="h-3 w-[50%] bg-base-content/5 rounded" />
                        </div>
                        <div className="h-1.5 w-full bg-base-content/5 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function FinanceBoardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-base-content/10 rounded-2xl" />
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-base-content/10 rounded" />
                        <div className="h-4 w-64 bg-base-content/5 rounded" />
                    </div>
                </div>
            </div>
            <div className="glass-panel rounded-3xl overflow-hidden border border-base-content/10">
                <div className="h-12 bg-base-content/5 w-full" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex h-16 items-center px-6 border-b border-base-content/5 gap-4">
                        <div className="w-8 h-8 rounded-lg bg-base-content/5" />
                        <div className="flex-1 h-4 bg-base-content/5 rounded" />
                        <div className="w-24 h-4 bg-base-content/10 rounded" />
                        <div className="w-20 h-6 bg-base-content/5 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function ReviewGridSkeleton() {
    return (
        <div className="space-y-8 animate-pulse p-4">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-base-content/10 rounded-2xl" />
                <div className="space-y-2">
                    <div className="h-7 w-56 bg-base-content/10 rounded" />
                    <div className="h-4 w-72 bg-base-content/5 rounded" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass-panel p-6 rounded-[32px] space-y-6">
                        <div className="flex justify-between">
                            <div className="space-y-2">
                                <div className="h-3 w-16 bg-base-content/10 rounded" />
                                <div className="h-5 w-32 bg-base-content/10 rounded" />
                            </div>
                            <div className="h-8 w-24 bg-base-content/5 rounded-full" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 w-full bg-base-content/5 rounded" />
                            <div className="h-6 w-32 bg-base-content/10 rounded" />
                        </div>
                        <div className="h-12 w-full bg-base-content/5 rounded-2xl" />
                    </div>
                ))}
            </div>
        </div>
    )
}
