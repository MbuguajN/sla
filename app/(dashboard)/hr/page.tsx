import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getHRStats, getEmployeesOnLeave, getEmployeesOnPremise } from '@/app/actions/hrActions'
import { getActiveReviewCycle } from '@/app/actions/reviewActions'
import Link from 'next/link'
import { CalendarOff, ArrowUpRight, UserCheck, UserX, Heart, Star, TrendingUp, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default async function HRDashboardPage() {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'HR' && role !== 'ADMIN') redirect('/')

    const [stats, onLeave, onPremise, activeCycle] = await Promise.all([
        getHRStats(),
        getEmployeesOnLeave(),
        getEmployeesOnPremise(),
        getActiveReviewCycle().catch(() => null)
    ])

    const totalStaff = stats.totalEmployees
    const attendanceRate = totalStaff > 0 ? Math.round((stats.onPremise / totalStaff) * 100) : 100

    return (
        <div className="space-y-8 pb-20">
            {/* Minimal Header */}
            <div className="flex items-end justify-between border-b border-base-content/5 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs opacity-70">
                        <Heart className="w-3 h-3" />
                        Human Resources
                    </div>
                    <h1 className="text-4xl font-bold text-base-content tracking-tight leading-none">People Overview</h1>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-base-content/20 font-bold uppercase tracking-wider">
                    <Activity className="w-3 h-3" />
                    {format(new Date(), 'EEEE, MMM d yyyy')}
                </div>
            </div>

            {/* KPI Row — flat, enterprise */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Headcount', value: totalStaff, sub: 'Total Active', color: 'text-base-content' },
                    { label: 'On Premise', value: stats.onPremise, sub: `${attendanceRate}% attendance`, color: 'text-success' },
                    { label: 'On Leave', value: stats.onLeave, sub: 'Currently away', color: 'text-warning' },
                    { label: 'Pending Requests', value: stats.pendingLeaves, sub: 'Awaiting review', color: stats.pendingLeaves > 0 ? 'text-error' : 'text-base-content/20' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-base-100 border border-base-content/10 p-5 rounded-2xl space-y-1 shadow-sm">
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-base-content/25 block">{kpi.label}</span>
                        <div className="flex items-baseline gap-2">
                            <span className={cn("text-2xl font-bold tracking-tight", kpi.color)}>{kpi.value}</span>
                            <span className="text-[10px] font-normal text-base-content/20 italic">{kpi.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Activity */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Access */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Link href="/hr/leaves" className="group bg-base-100 border border-base-content/10 rounded-2xl p-4 flex items-center gap-3 hover:border-warning/30 transition-all shadow-sm">
                            <div className="w-9 h-9 bg-warning/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <CalendarOff className="w-4 h-4 text-warning" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-base-content truncate">Leave Manager</p>
                                <p className="text-[9px] text-base-content/25">{stats.pendingLeaves} pending</p>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-base-content/10 group-hover:text-warning transition-colors shrink-0" />
                        </Link>

                        <Link href="/hr/reviews" className="group bg-base-100 border border-base-content/10 rounded-2xl p-4 flex items-center gap-3 hover:border-success/30 transition-all shadow-sm">
                            <div className="w-9 h-9 bg-success/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Star className="w-4 h-4 text-success" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-base-content truncate">Reviews</p>
                                <p className="text-[9px] text-base-content/25">{activeCycle ? 'Active cycle' : 'No active'}</p>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-base-content/10 group-hover:text-success transition-colors shrink-0" />
                        </Link>

                        <Link href="/hr/suggestions" className="group bg-base-100 border border-base-content/10 rounded-2xl p-4 flex items-center gap-3 hover:border-info/30 transition-all shadow-sm">
                            <div className="w-9 h-9 bg-info/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-4 h-4 text-info" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-base-content truncate">Suggestions</p>
                                <p className="text-[9px] text-base-content/25">{stats.openSuggestions} open</p>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-base-content/10 group-hover:text-info transition-colors shrink-0" />
                        </Link>
                    </div>

                    {/* On Leave Table */}
                    <div className="bg-base-100 border border-base-content/10 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-base-content/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserX className="w-4 h-4 text-warning" />
                                <h2 className="text-xs font-black uppercase tracking-widest text-base-content">Currently On Leave</h2>
                                <span className="text-[9px] bg-warning/10 text-warning font-bold px-2 py-0.5 rounded-lg">{onLeave.length}</span>
                            </div>
                            <Link href="/hr/leaves" className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">
                                View All
                            </Link>
                        </div>
                        {onLeave.length === 0 ? (
                            <div className="text-center py-12 text-[11px] text-base-content/15 italic font-medium">No employees currently on leave</div>
                        ) : (
                            <div className="divide-y divide-base-content/5">
                                {onLeave.slice(0, 6).map((leave: any) => (
                                    <div key={leave.id} className="flex items-center gap-3 px-6 py-3 hover:bg-base-content/[0.02] transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center font-black text-[10px]">
                                            {leave.user.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-base-content truncate">{leave.user.name}</p>
                                            <p className="text-[9px] text-base-content/25">{leave.user.department?.name || 'N/A'}</p>
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider bg-warning/10 text-warning px-2 py-1 rounded-lg">{leave.type}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Staff Directory */}
                <div className="bg-base-100 border border-base-content/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-base-content/5 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-success" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-base-content">On Premise</h2>
                        <span className="text-[9px] bg-success/10 text-success font-bold px-2 py-0.5 rounded-lg">{onPremise.length}</span>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                        <div className="divide-y divide-base-content/5">
                            {onPremise.map((user: any) => (
                                <div key={user.id} className="flex items-center gap-3 px-6 py-2.5 hover:bg-base-content/[0.02] transition-colors">
                                    <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center font-bold text-[9px]">
                                        {user.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-base-content truncate">{user.name}</p>
                                        <p className="text-[9px] text-base-content/20 uppercase tracking-wider">{user.department?.name || user.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
