import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getHRStats, getEmployeesOnLeave, getEmployeesOnPremise } from '@/app/actions/hrActions'
import Link from 'next/link'
import { Users, CalendarOff, Building2, ClipboardList, ArrowUpRight, UserCheck, UserX, MessageSquare, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function HRDashboardPage() {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'HR' && role !== 'ADMIN') redirect('/')

    const [stats, onLeave, onPremise] = await Promise.all([
        getHRStats(),
        getEmployeesOnLeave(),
        getEmployeesOnPremise()
    ])

    return (
        <div className="space-y-8 pb-20">
            {/* Hero Header */}
            <div className="relative overflow-hidden glass-panel rounded-3xl p-8 md:p-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-warning/5 blur-[60px] rounded-full -ml-24 -mb-24" />
                <div className="relative flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary text-white rounded-3xl flex items-center justify-center shadow-ruby-soft shrink-0">
                        <Heart className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">People & Operations</h1>
                        <p className="text-[11px] font-bold text-base-content/30 uppercase tracking-[0.2em] mt-1">Human Resources Management</p>
                    </div>
                </div>

                {/* Stat Cards inside header */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    {[
                        { label: 'Total Staff', val: stats.totalEmployees, col: 'text-primary', ring: 'ring-primary/10' },
                        { label: 'On Leave', val: stats.onLeave, col: 'text-warning', ring: 'ring-warning/10' },
                        { label: 'On Premise', val: stats.onPremise, col: 'text-success', ring: 'ring-success/10' },
                        { label: 'Pending', val: stats.pendingLeaves, col: 'text-error', ring: 'ring-error/10' },
                    ].map((s, i) => (
                        <div key={i} className={cn("bg-base-100/50 backdrop-blur-sm rounded-2xl p-5 ring-1 transition-all hover:scale-[1.03]", s.ring)}>
                            <span className="text-[9px] uppercase font-black tracking-[0.3em] text-base-content/20 block mb-1">{s.label}</span>
                            <span className={cn("text-3xl font-black tracking-tighter", s.col)}>{s.val}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Link href="/hr/leaves" className="group glass-panel rounded-3xl p-6 flex items-center gap-5 hover:ring-1 hover:ring-warning/20 transition-all">
                    <div className="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <CalendarOff className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Leave Tracker</h3>
                        <p className="text-[10px] text-base-content/30 mt-0.5">{stats.pendingLeaves} pending review</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-base-content/10 group-hover:text-warning transition-colors" />
                </Link>

                <Link href="/hr/suggestions" className="group glass-panel rounded-3xl p-6 flex items-center gap-5 hover:ring-1 hover:ring-info/20 transition-all">
                    <div className="w-12 h-12 bg-info/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-5 h-5 text-info" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Suggestion Box</h3>
                        <p className="text-[10px] text-base-content/30 mt-0.5">{stats.openSuggestions} open suggestions</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-base-content/10 group-hover:text-info transition-colors" />
                </Link>
            </div>

            {/* Two-column: On Leave + On Premise */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* On Leave */}
                <div className="glass-panel rounded-3xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-base-content/5 flex items-center gap-3">
                        <UserX className="w-4 h-4 text-warning" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-base-content">On Leave</h2>
                        <span className="badge badge-sm bg-warning/10 text-warning border-none font-bold text-[10px]">{onLeave.length}</span>
                    </div>
                    <div className="p-3 max-h-[400px] overflow-y-auto">
                        {onLeave.length === 0 ? (
                            <div className="text-center py-16 text-[11px] text-base-content/20 italic font-bold">Nobody on leave today</div>
                        ) : (
                            <div className="space-y-1">
                                {onLeave.map((leave: any) => (
                                    <div key={leave.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-base-content/[0.03] transition-colors">
                                        <div className="w-9 h-9 rounded-xl bg-warning/10 text-warning flex items-center justify-center font-black text-xs shrink-0">
                                            {leave.user.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-base-content truncate">{leave.user.name}</p>
                                            <p className="text-[10px] text-base-content/30">{leave.type} • {leave.user.department?.name || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* On Premise */}
                <div className="glass-panel rounded-3xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-base-content/5 flex items-center gap-3">
                        <UserCheck className="w-4 h-4 text-success" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-base-content">On Premise</h2>
                        <span className="badge badge-sm bg-success/10 text-success border-none font-bold text-[10px]">{onPremise.length}</span>
                    </div>
                    <div className="p-3 max-h-[400px] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {onPremise.map((user: any) => (
                                <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-base-content/[0.03] transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center font-black text-[10px] shrink-0">
                                        {user.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-base-content truncate">{user.name}</p>
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
