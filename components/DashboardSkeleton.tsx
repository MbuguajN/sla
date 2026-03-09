import React from 'react';

const CardSkeleton = ({ height = '160px', className = '' }) => (
    <div
        className={`bg-base-200/50 animate-pulse rounded-3xl border border-base-content/20 ${className}`}
        style={{ height }}
    />
);

export default function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-base-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-40 bg-base-200 rounded-md animate-pulse opacity-50" />
                </div>
                <div className="flex -space-x-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-base-200 border-2 border-base-100 animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <CardSkeleton height="120px" />
                    <CardSkeleton height="120px" />
                </div>
                <div className="lg:col-span-3">
                    <CardSkeleton height="120px" />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="h-6 w-32 bg-base-200 rounded-lg animate-pulse" />
                    <div className="h-9 w-24 bg-base-200 rounded-xl animate-pulse" />
                </div>
                <CardSkeleton height="400px" />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-base-content/20">
                <CardSkeleton height="180px" />
                <CardSkeleton height="180px" />
                <CardSkeleton height="180px" />
            </div>
        </div>
    );
}
