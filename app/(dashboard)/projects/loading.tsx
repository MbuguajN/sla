import React from 'react'
import { ProjectsGridSkeleton } from '@/components/dashboard/DashboardSkeletons'

export default function Loading() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-48 bg-base-content/10 rounded-lg mb-2" />
                    <div className="h-4 w-64 bg-base-content/5 rounded" />
                </div>
                <div className="h-10 w-40 bg-base-content/10 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-64 bg-base-100 border border-base-content/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="w-11 h-11 bg-base-content/5 rounded-2xl" />
                            <div className="h-6 w-20 bg-base-content/5 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-5 w-[80%] bg-base-content/10 rounded" />
                            <div className="h-4 w-[60%] bg-base-content/5 rounded" />
                        </div>
                        <div className="pt-4 space-y-2">
                            <div className="h-3 w-16 bg-base-content/5 rounded" />
                            <div className="h-2 w-full bg-base-content/10 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
