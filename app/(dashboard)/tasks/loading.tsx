import React from 'react'
import { GlobalTaskTableSkeleton } from '@/components/dashboard/DashboardSkeletons'

export default function Loading() {
    return (
        <div className="space-y-8 animate-pulse">
            <div>
                <div className="h-8 w-48 bg-base-content/10 rounded-lg mb-2" />
                <div className="h-4 w-64 bg-base-content/5 rounded" />
            </div>
            <GlobalTaskTableSkeleton />
        </div>
    )
}
