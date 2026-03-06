import React from 'react';

const CardSkeleton = ({ height = '120px', className = '' }) => (
    <div
        className={`bg-base-200/40 animate-pulse rounded-3xl border border-base-content/5 ${className}`}
        style={{ height }}
    />
);

export default function AdminSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Admin Hero Header Skeleton */}
            <div className="relative overflow-hidden glass-panel rounded-3xl p-8 md:p-10">
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-base-200 rounded-3xl animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-8 w-48 bg-base-200 rounded-lg animate-pulse" />
                            <div className="h-4 w-64 bg-base-200 rounded-md animate-pulse opacity-40" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-28 bg-base-200/50 rounded-2xl animate-pulse" />
                        <div className="h-10 w-32 bg-base-200 rounded-xl animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="glass-panel rounded-3xl overflow-hidden divide-y divide-base-content/5">
                <div className="h-14 w-full bg-base-content/5 animate-pulse" />
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-6 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-base-200 animate-pulse" />
                        <div className="space-y-2 flex-1">
                            <div className="h-4 w-40 bg-base-200 rounded animate-pulse" />
                            <div className="h-3 w-64 bg-base-200 rounded animate-pulse opacity-40" />
                        </div>
                        <div className="h-6 w-20 bg-base-200/50 rounded-lg animate-pulse" />
                        <div className="h-6 w-24 bg-base-200/50 rounded-lg animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
