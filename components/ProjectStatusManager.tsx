'use client'

import React, { useState } from 'react'
import { CheckCircle2, PauseCircle, XCircle, AlertCircle, ChevronDown, Loader2 } from 'lucide-react'
import { updateProjectStatus } from '@/app/actions/projectActions'
import { cn } from '@/lib/utils'

export default function ProjectStatusManager({
    projectId,
    initialStatus,
    userDept,
    userRole
}: {
    projectId: number,
    initialStatus: string,
    userDept: string,
    userRole: string
}) {
    const [status, setStatus] = useState(initialStatus || 'ACTIVE')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const isAdmin = ['ADMIN', 'CEO', 'SUPER_ADMIN'].includes(userRole)
    const isBD = userDept === 'BUSINESS_DEVELOPMENT' || userDept === 'BUSINESS DEVELOPMENT'

    // Only BD and Admin can change main project status
    const canManage = isAdmin || isBD

    async function handleStatusChange(newStatus: string) {
        if (!canManage) return

        setLoading(true)
        setMessage(null)
        try {
            const res = await updateProjectStatus(projectId, newStatus)
            if (res.success) {
                setStatus(newStatus)
                setMessage({ type: 'success', text: 'Status updated' })
            } else {
                setMessage({ type: 'error', text: res.error || 'Update failed' })
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to update' })
        } finally {
            setLoading(false)
        }
    }

    const getStatusConfig = (s: string) => {
        switch (s.toUpperCase()) {
            case 'ACTIVE': return { bg: 'bg-success/10', text: 'text-success', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Active' }
            case 'PAUSED': return { bg: 'bg-warning/10', text: 'text-warning', icon: <PauseCircle className="w-4 h-4" />, label: 'Paused' }
            case 'ON_HOLD': return { bg: 'bg-warning/10', text: 'text-warning', icon: <AlertCircle className="w-4 h-4" />, label: 'On Hold' }
            case 'CLOSED': return { bg: 'bg-error/10', text: 'text-error', icon: <XCircle className="w-4 h-4" />, label: 'Closed' }
            case 'COMPLETED': return { bg: 'bg-primary/10', text: 'text-primary', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Completed' }
            default: return { bg: 'bg-base-200', text: 'text-base-content/70', icon: <AlertCircle className="w-4 h-4" />, label: s }
        }
    }

    const config = getStatusConfig(status)

    return (
        <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-1.5 relative group">
            <span className="text-xs font-black uppercase tracking-widest text-base-content/70">Status Control</span>

            <div className="flex items-center justify-between">
                <div className={cn("flex items-center gap-2 font-black text-base uppercase tracking-tighter", config.text)}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : config.icon}
                    <span>{config.label}</span>
                </div>

                {canManage && (
                    <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-ghost btn-xs btn-circle opacity-40 group-hover:opacity-100">
                            <ChevronDown className="w-3 h-3" />
                        </label>
                        <ul tabIndex={0} className="dropdown-content z-[20] menu p-2 shadow-xl bg-base-100 rounded-2xl border border-base-200 w-48 mt-2 animate-in fade-in slide-in-from-top-2">
                            <li className="menu-title text-[10px] font-black uppercase tracking-widest opacity-40 px-3 py-1">Shift Project Lifecycle</li>
                            {['ACTIVE', 'PAUSED', 'ON_HOLD', 'COMPLETED', 'CLOSED'].map(s => (
                                <li key={s}>
                                    <button
                                        onClick={() => handleStatusChange(s)}
                                        className={cn(
                                            "flex items-center gap-2 text-xs font-bold uppercase tracking-wider py-2.5",
                                            status === s ? "bg-base-200" : ""
                                        )}
                                    >
                                        <div className={cn("w-1.5 h-1.5 rounded-full", getStatusConfig(s).text.replace('text-', 'bg-'))} />
                                        {s.replace('_', ' ')}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <p className={cn(
                "text-xs font-bold uppercase transition-opacity",
                message ? "opacity-100" : "opacity-60"
            )}>
                {message ? (
                    <span className={message.type === 'success' ? 'text-success' : 'text-error'}>{message.text}</span>
                ) : (
                    status === 'ACTIVE' ? 'Operational pulse optimal' :
                        status === 'PAUSED' ? 'Suspended for review' :
                            status === 'COMPLETED' ? 'Objective realized' : 'Lifecycle terminated'
                )}
            </p>
        </div>
    )
}
