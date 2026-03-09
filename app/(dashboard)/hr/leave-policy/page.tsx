'use client'

import React, { useState, useEffect } from 'react'
import { getLeavePolicies, saveLeavePolicies } from '@/app/actions/leavePolicyActions'
import { CheckCircle2, AlertCircle, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_CATEGORIES = [
    { key: 'CEO', label: 'CEO / Directors', description: 'Top-level executives' },
    { key: 'MANAGER', label: 'Managers / Admin / HR', description: 'Department heads and administrators' },
    { key: 'EMPLOYEE', label: 'General Employees', description: 'Standard staff members' },
]

export default function LeavePolicyPage() {
    const [policies, setPolicies] = useState(
        ROLE_CATEGORIES.map(r => ({ roleCategory: r.key, annualDays: 21, sickDays: 10 }))
    )
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        getLeavePolicies().then((existing) => {
            if (existing.length > 0) {
                setPolicies(prev =>
                    prev.map(p => {
                        const match = existing.find((e: any) => e.roleCategory === p.roleCategory)
                        return match ? { ...p, annualDays: match.annualDays, sickDays: match.sickDays } : p
                    })
                )
            }
        })
    }, [])

    const updatePolicy = (key: string, field: 'annualDays' | 'sickDays', value: number) => {
        setPolicies(prev => prev.map(p => p.roleCategory === key ? { ...p, [field]: value } : p))
    }

    const handleSave = async () => {
        setLoading(true)
        setMessage(null)
        try {
            await saveLeavePolicies(policies)
            setMessage({ type: 'success', text: 'Leave policies saved successfully' })
        } catch {
            setMessage({ type: 'error', text: 'Failed to save policies' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-base-content">Leave Policy</h1>
                <p className="text-sm font-bold text-base-content/30 uppercase tracking-[0.2em] mt-1">
                    Configure leave allocation per role
                </p>
            </div>

            <div className="space-y-4">
                {ROLE_CATEGORIES.map((role, i) => {
                    const policy = policies.find(p => p.roleCategory === role.key)!
                    return (
                        <div key={role.key} className="glass-panel rounded-3xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <Settings2 className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-base-content">{role.label}</h3>
                                    <p className="text-sm text-base-content/30">{role.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-black uppercase tracking-widest text-base-content/30 block mb-2">
                                        Annual Leave Days
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="365"
                                        className="input input-bordered input-sm w-full max-w-xs"
                                        value={policy.annualDays}
                                        onChange={e => updatePolicy(role.key, 'annualDays', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-black uppercase tracking-widest text-base-content/30 block mb-2">
                                        Sick Leave Days
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="365"
                                        className="input input-bordered input-sm w-full max-w-xs"
                                        value={policy.sickDays}
                                        onChange={e => updatePolicy(role.key, 'sickDays', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {message && (
                <div className={cn("flex items-center gap-2 text-sm font-bold uppercase tracking-widest py-2 px-3 rounded-lg", message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>
                    {message.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {message.text}
                </div>
            )}

            <button onClick={handleSave} disabled={loading} className="btn btn-primary btn-sm font-black uppercase tracking-widest text-sm">
                {loading ? <span className="loading loading-spinner loading-xs" /> : 'Save Leave Policies'}
            </button>
        </div>
    )
}
