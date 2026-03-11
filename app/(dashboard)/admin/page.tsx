export const dynamic = 'force-dynamic'
import React from 'react'
import prisma from '@/lib/db'
import { Users, Building2, Shield, Settings, Activity, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
    const [userCount, deptCount, projectCount, taskCount] = await Promise.all([
        prisma.user.count(),
        prisma.department.count(),
        prisma.project.count(),
          prisma.task.count({ where: { status: { notIn: ['COMPLETED', 'DISMISSED'] } } })
    ])

    const stats = [
        { label: 'Total Personnel', value: userCount, Icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', href: '/admin/users' },
        { label: 'Departments', value: deptCount, Icon: Building2, color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/admin/departments' },
        { label: 'Active Projects', value: projectCount, Icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10', href: '/projects' },
        { label: 'Pending Tasks', value: taskCount, Icon: Shield, color: 'text-ruby-red', bg: 'bg-ruby-red/10', href: '/tasks' }
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Section */}
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full -mr-32 -mt-32" />
                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-base-content mb-2 tracking-tight">Systems Command Center</h2>
                    <p className="text-base-content/60 max-w-2xl font-medium">Control hub for global system configurations, personnel management, and departmental oversight.</p>
                </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="glass-panel p-6 rounded-3xl group hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:rotate-12`}>
                                <stat.Icon size={24} />
                            </div>
                            <ArrowUpRight className="text-base-content/20 group-hover:text-primary transition-colors" size={20} />
                        </div>
                        <div className="space-y-1">
                            <span className="text-base-content/40 text-xs font-black uppercase tracking-[0.2em]">{stat.label}</span>
                            <div className="text-3xl font-black text-base-content tracking-tighter">{stat.value}</div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions / Status Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                <div className="glass-panel p-8 rounded-3xl border-l-4 border-l-primary">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <Settings size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-base-content">System Environment</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-2xl">
                            <span className="text-sm font-bold text-base-content/70">Cache Status</span>
                            <span className="badge badge-success badge-sm font-bold">Optimized</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-2xl">
                            <span className="text-sm font-bold text-base-content/70">Database Engine</span>
                            <span className="text-xs font-mono opacity-50 uppercase tracking-widest">SQLite + Prisma</span>
                        </div>
                        <Link href="/admin/settings" className="btn btn-primary btn-block rounded-2xl gap-2 mt-4 shadow-ruby-soft">
                            Access General Settings
                        </Link>
                    </div>
                </div>

                <div className="glass-panel p-8 rounded-3xl border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                            <Shield size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-base-content">Security & Access</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-2xl">
                            <span className="text-sm font-bold text-base-content/70">Authorized Roles</span>
                            <span className="flex gap-1 font-black text-xs">
                                <span className="text-primary tracking-tighter">CEO</span>
                                <span className="text-base-content/20">•</span>
                                <span className="text-primary tracking-tighter">ADMIN</span>
                                <span className="text-base-content/20">•</span>
                                <span className="text-primary tracking-tighter">HR</span>
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-2xl">
                            <span className="text-sm font-bold text-base-content/70">Auditing Status</span>
                            <span className="text-xs font-mono text-success opacity-80 font-bold">ACTIVE</span>
                        </div>
                        <Link href="/admin/users" className="btn btn-neutral btn-block rounded-2xl gap-2 mt-4">
                            Manage User Access
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
