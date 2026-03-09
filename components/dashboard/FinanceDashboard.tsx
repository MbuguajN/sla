'use client'

import React, { useMemo, useState } from 'react'
import {
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    ShieldCheck,
    ArrowUpRight,
    ArrowRight,
    Search,
    User,
    MessageSquare,
    Eye,
    Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

interface Requisition {
    id: number
    status: string
    totalAmount: number
    createdAt: Date
    user: { name: string; role: string }
    items: { itemName: string }[]
}

interface FinanceDashboardProps {
    requisitions: Requisition[]
    activeUsers: any[]
}

export default function FinanceDashboard({
    requisitions,
    activeUsers
}: FinanceDashboardProps) {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    const pendingReqs = useMemo(() => requisitions.filter(r => r.status === 'PENDING'), [requisitions])
    const totalPendingValue = useMemo(() => pendingReqs.reduce((sum, r) => sum + r.totalAmount, 0), [pendingReqs])

    const approvedAll = useMemo(() => requisitions.filter(r => r.status === 'APPROVED'), [requisitions])

    // Filtered Spend Data
    const filteredSpendData = useMemo(() => {
        const start = startOfMonth(new Date(selectedYear, selectedMonth))
        const end = endOfMonth(new Date(selectedYear, selectedMonth))
        return approvedAll.filter(r => isWithinInterval(new Date(r.createdAt), { start, end }))
    }, [approvedAll, selectedMonth, selectedYear])

    const totalApprovedValue = useMemo(() => filteredSpendData.reduce((sum, r) => sum + r.totalAmount, 0), [filteredSpendData])

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-base-300 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs opacity-70">
                        <DollarSign className="w-3 h-3" />
                        Finance Command Center
                    </div>
                    <h1 className="text-4xl font-bold text-base-content tracking-tight leading-none uppercase">
                        Accounts & Finance
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/finance-pool" className="btn btn-primary h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                        Manage Pool <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </div>
            </div>

            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { label: 'Pending Approval', value: pendingReqs.length, sub: `KES ${totalPendingValue.toLocaleString()}`, icon: Clock, color: 'text-warning' },
                    {
                        label: 'Monthly Use', value: approvedAll.filter(r => {
                            const now = new Date();
                            const start = startOfMonth(now);
                            return new Date(r.createdAt) >= start;
                        }).length, sub: 'Items Processed (Current Month)', icon: CheckCircle2, color: 'text-success'
                    }
                ].map((kpi, i) => (
                    <div key={i} className="glass-panel p-6 rounded-[32px] border border-base-content/5 flex items-center justify-between group hover:border-primary/20 transition-all duration-300">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 block">
                                {kpi.label}
                            </span>
                            <div className="flex flex-col">
                                <span className={cn("text-3xl font-black tracking-tighter", kpi.color)}>
                                    {kpi.value}
                                </span>
                                <span className="text-xs font-bold text-base-content/40 uppercase tracking-tight">
                                    {kpi.sub}
                                </span>
                            </div>
                        </div>
                        <div className={cn("p-4 rounded-2xl bg-base-content/5 group-hover:bg-primary/5 transition-colors", kpi.color)}>
                            <kpi.icon className="w-6 h-6 opacity-70" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left: Requisition Action Registry */}
                <div className="xl:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-primary rounded-full transition-all group-hover:scale-y-150" />
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content/80">Pending Action Registry</h2>
                        </div>
                    </div>

                    <div className="glass-panel rounded-[32px] overflow-hidden border border-base-content/5 shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-base-content/5 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 border-b border-base-content/5">
                                    <tr>
                                        <th className="pl-8 h-12">Submitter</th>
                                        <th>Primary Item</th>
                                        <th className="text-right">Value</th>
                                        <th className="text-right pr-8">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-base-content/[0.03]">
                                    {pendingReqs.slice(0, 5).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-20 text-sm font-bold text-base-content/30 italic">
                                                No pending requisitions in queue
                                            </td>
                                        </tr>
                                    ) : pendingReqs.slice(0, 5).map(req => (
                                        <tr key={req.id} className="hover:bg-base-content/[0.02] group transition-all h-20">
                                            <td className="pl-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-base-content/5 text-base-content/40 font-black text-xs flex items-center justify-center">
                                                        {req.user.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-base-content">{req.user.name}</span>
                                                        <span className="text-[10px] font-black text-base-content/30 uppercase tracking-tighter">{req.user.role}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-base-content truncate max-w-[200px]">{req.items[0]?.itemName}</span>
                                                    <span className="text-[10px] font-black text-base-content/30 uppercase tracking-widest">{format(new Date(req.createdAt), 'MMM d, yyyy')}</span>
                                                </div>
                                            </td>
                                            <td className="text-right font-black text-sm text-primary tabular-nums">
                                                KES {req.totalAmount.toLocaleString()}
                                            </td>
                                            <td className="text-right pr-8">
                                                <Link href="/finance-pool" className="btn btn-ghost btn-circle btn-sm text-primary hover:bg-primary/10">
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pendingReqs.length > 5 && (
                            <Link href="/finance-pool" className="block p-4 bg-base-content/5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-base-content/10 transition-all">
                                View Full Registry ({pendingReqs.length} total)
                            </Link>
                        )}
                    </div>
                </div>

                {/* Right: Quick Stats & Insights */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-info rounded-full" />
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content/80">Financial Insights</h2>
                    </div>

                    <div className="glass-panel p-8 rounded-[32px] border border-base-content/5 bg-primary/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -mr-16 -mt-16" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between pb-2 border-b border-base-content/10">
                                <h3 className="text-lg font-black text-base-content tracking-tight uppercase">Monthly Spend</h3>
                                <TrendingUp className="text-success w-5 h-5" />
                            </div>

                            {/* Month/Year Filter Row */}
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    className="select select-ghost select-xs font-bold text-primary focus:bg-transparent"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                >
                                    {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                </select>
                                <select
                                    className="select select-ghost select-xs font-bold text-primary focus:bg-transparent"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-base-content/40 uppercase tracking-widest">Total Value Approved</span>
                                    <span className="text-2xl font-black text-base-content tabular-nums">KES {totalApprovedValue.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-base-content/30 uppercase tracking-tighter">
                                    <Calendar className="w-3 h-3" />
                                    Period: {months[selectedMonth]} {selectedYear}
                                </div>
                            </div>

                            <p className="text-xs font-medium text-base-content/60 italic leading-relaxed pt-2">
                                {totalApprovedValue > 0
                                    ? `Showing strategic spend distribution for the selected period across ${filteredSpendData.length} items.`
                                    : "No financial activity recorded in the selected period."
                                }
                            </p>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-[32px] border border-base-content/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-info/10 text-info flex items-center justify-center">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-base-content uppercase tracking-tight">Accounts Verified</h4>
                            <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">Compliant with internal SLA</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
