import React from 'react';

const CardSkeleton = ({ height = '140px', className = '' }) => (
    <div
        className={`bg-base-200/40 animate-pulse rounded-3xl border border-base-content/5 ${className}`}
        style={{ height }}
    />
);

export default function SystemSettingsSkeleton() {
    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Page Title Skeleton */}
            <div className="space-y-2">
                <div className="h-9 w-64 bg-base-200 rounded-lg animate-pulse" />
                <div className="h-4 w-48 bg-base-200 rounded-md animate-pulse opacity-50" />
            </div>

            {/* Tabs Skeleton */}
            <div className="flex items-center gap-2 p-1.5 bg-base-content/5 rounded-2xl w-fit">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-28 bg-base-200/50 rounded-xl animate-pulse" />
                ))}
            </div>

            {/* Content Skeleton */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-base-200 rounded-lg animate-pulse" />
                    <div className="h-3 w-32 bg-base-200 rounded-md animate-pulse opacity-40" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CardSkeleton height="280px" />
                    <CardSkeleton height="280px" />
                </div>
            </div>

            {/* Settings Form Skeleton */}
            <div className="glass-panel p-8 rounded-3xl space-y-6">
                <div className="h-5 w-40 bg-base-200 rounded-lg animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="h-3 w-32 bg-base-200 rounded-md animate-pulse" />
                        <div className="h-10 w-full bg-base-200/50 rounded-xl animate-pulse" />
                    </div>
                </div>
                <div className="h-9 w-32 bg-base-200 rounded-xl animate-pulse" />
            </div>
        </div>
    );
}
