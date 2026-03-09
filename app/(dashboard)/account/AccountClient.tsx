'use client'

import React, { useState, useRef, useEffect } from 'react'
import { updateProfile, uploadAvatar } from '@/app/actions/profileActions'
import { createLeaveRequest } from '@/app/actions/hrActions'
import { getMyLeaveBalance } from '@/app/actions/leavePolicyActions'
import { createSuggestion } from '@/app/actions/suggestionActions'
import { createITSupportRequest } from '@/app/actions/itSupportActions'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import {
    User, CalendarDays, CalendarOff, MessageSquare, Monitor, Send, Shield,
    CheckCircle2, XCircle, Clock, Plus, ChevronDown, ChevronUp,
    Camera, Lock, Eye, EyeOff, Pencil, Activity, DollarSign, Trash2, Calculator
} from 'lucide-react'
import { LimelightNav } from '@/components/ui/limelight-nav'
import { createRequisition } from '@/app/actions/financeActions'

type AccountClientProps = {
    user: any
    leaves: any[]
    suggestions: any[]
    itRequests: any[]
    requisitions: any[]
}

export default function AccountClient({ user, leaves, suggestions, itRequests, requisitions }: AccountClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('profile')

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <User /> },
        { id: 'leave', label: 'Leave', icon: <CalendarDays /> },
        { id: 'suggestions', label: 'Suggestions', icon: <MessageSquare /> },
        { id: 'it', label: 'IT Support', icon: <Monitor /> },
        { id: 'finance', label: 'Finance', icon: <DollarSign /> },
    ]

    return (
        <div className="space-y-8">
            {/* Profile Header */}
            <ProfileHeader user={user} />

            {/* Tabs */}
            <div className="flex justify-center md:justify-start">
                <LimelightNav
                    items={tabs}
                    defaultActiveIndex={tabs.findIndex(t => t.id === activeTab)}
                    onTabChange={(index) => setActiveTab(tabs[index].id)}
                    activeColor="#be1e3d"
                />
            </div>

            {/* Tab Content */}
            <div className="mt-8 animate-fade-in">
                {activeTab === 'profile' && <ProfileTab user={user} />}
                {activeTab === 'leave' && <LeaveTab leaves={leaves} />}
                {activeTab === 'suggestions' && <SuggestionsTab suggestions={suggestions} />}
                {activeTab === 'it' && <ITSupportTab itRequests={itRequests} />}
                {activeTab === 'finance' && <FinanceTab requisitions={requisitions} />}
            </div>
        </div>
    )
}

// ─── Profile Header ───
function ProfileHeader({ user }: { user: any }) {
    return (
        <div className="glass-panel rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full -mr-20 -mt-20" />
            <div className="w-24 h-24 rounded-3xl bg-primary text-white flex items-center justify-center text-4xl font-black shadow-ruby-soft shrink-0 overflow-hidden ring-4 ring-primary/20">
                {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    user.name?.charAt(0) || '?'
                )}
            </div>
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-extrabold tracking-tight text-base-content">{user.name}</h1>
                <p className="text-sm text-base-content/70 mt-0.5">{user.email}</p>
                <div className="flex items-center gap-3 mt-2 justify-center md:justify-start">
                    <span className="badge badge-sm bg-primary/10 text-primary border-none font-bold text-sm uppercase tracking-wider">{user.role}</span>
                    {user.department && (
                        <span className="badge badge-sm bg-base-content/5 text-base-content/70 border-none font-bold text-sm uppercase tracking-wider">{user.department.name}</span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-success font-bold uppercase tracking-wider">
                        <Activity className="w-3 h-3" /> Active
                    </span>
                </div>
            </div>
            <div className="md:ml-auto text-center md:text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-base-content/70">Member Since</p>
                <p className="text-sm font-bold text-base-content/70">{user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '—'}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-base-content/70 mt-2">Last Active</p>
                <p className="text-xs font-bold text-success">{user.lastActiveAt ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true }) : '—'}</p>
            </div>
        </div>
    )
}

// ─── Profile Tab (Password, Avatar) ───
function ProfileTab({ user }: { user: any }) {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [avatarUploading, setAvatarUploading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    async function handlePasswordReset() {
        if (!password || password.length < 6) {
            setMsg({ type: 'error', text: 'Password must be at least 6 characters' })
            return
        }
        if (password !== confirmPassword) {
            setMsg({ type: 'error', text: 'Passwords do not match' })
            return
        }
        setSaving(true)
        setMsg(null)
        try {
            await updateProfile({ password })
            setPassword('')
            setConfirmPassword('')
            setMsg({ type: 'success', text: 'Password updated successfully' })
        } catch {
            setMsg({ type: 'error', text: 'Failed to update password' })
        } finally {
            setSaving(false)
        }
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setAvatarUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await uploadAvatar(fd)
            if (res.success) {
                setMsg({ type: 'success', text: 'Avatar updated' })
                router.refresh()
            } else {
                setMsg({ type: 'error', text: res.error || 'Upload failed' })
            }
        } catch {
            setMsg({ type: 'error', text: 'Upload failed' })
        } finally {
            setAvatarUploading(false)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Avatar Upload */}
            <div className="glass-panel rounded-[32px] p-10 space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-base-content/40 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" /> Visual Identity
                </h3>
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-[40px] bg-primary/10 flex items-center justify-center overflow-hidden ring-8 ring-primary/5 shadow-2xl transition-transform group-hover:scale-105">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-5xl font-black text-primary uppercase">{user.name?.charAt(0) || '?'}</span>
                            )}
                        </div>
                        {avatarUploading && (
                            <div className="absolute inset-0 rounded-[40px] bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                <span className="loading loading-spinner text-white" />
                            </div>
                        )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <div className="text-center">
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={avatarUploading}
                            className="btn btn-primary rounded-2xl px-8 shadow-lg shadow-primary/20 gap-2"
                        >
                            <Pencil className="w-4 h-4" />
                            Update Avatar
                        </button>
                        <p className="text-[10px] font-bold text-base-content/30 uppercase tracking-widest mt-4">JPG, PNG or WEBP. Max 2MB.</p>
                    </div>
                </div>
            </div>

            {/* Password Reset */}
            <div className="glass-panel rounded-[32px] p-10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 blur-3xl rounded-full -mr-10 -mt-10" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-base-content/40 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-warning" /> Security Protocol
                </h3>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 block ml-1">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="input input-bordered h-12 w-full rounded-2xl bg-base-content/5 border-none focus:ring-2 ring-warning/20 font-bold"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-warning transition-colors">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 block ml-1">Confirm Identity</label>
                        <input
                            type="password"
                            className="input input-bordered h-12 w-full rounded-2xl bg-base-content/5 border-none focus:ring-2 ring-warning/20 font-bold"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    {msg && (
                        <div className={cn("flex items-center gap-3 text-xs font-black uppercase tracking-widest py-4 px-5 rounded-2xl animate-in slide-in-from-top-2",
                            msg.type === 'success' ? 'bg-success/10 text-success border border-success/10' : 'bg-error/10 text-error border border-error/10')}>
                            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {msg.text}
                        </div>
                    )}

                    <button onClick={handlePasswordReset} disabled={saving} className="btn w-full h-12 rounded-2xl bg-warning text-white border-none shadow-lg shadow-warning/20 font-black uppercase tracking-widest text-xs gap-2 hover:brightness-110">
                        {saving ? <span className="loading loading-spinner loading-xs" /> : <Shield className="w-4 h-4" />}
                        Commit Changes
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Leave Requests Tab ───
function LeaveTab({ leaves }: { leaves: any[] }) {
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' })
    const [balance, setBalance] = useState<any>(null)
    const router = useRouter()

    useEffect(() => {
        getMyLeaveBalance().then(setBalance).catch(() => { })
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        try {
            await createLeaveRequest(form)
            setForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' })
            setShowForm(false)
            router.refresh()
            // Refresh balance
            getMyLeaveBalance().then(setBalance).catch(() => { })
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const statusStyles: Record<string, string> = {
        PENDING: 'bg-warning/10 text-warning',
        APPROVED: 'bg-success/10 text-success',
        DENIED: 'bg-error/10 text-error'
    }

    return (
        <div className="space-y-6">
            {/* Leave Balance */}
            {balance && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-panel rounded-3xl p-5">
                        <span className="text-xs uppercase font-black tracking-[0.3em] text-base-content/70 block mb-2">Annual Leave</span>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-black text-primary">{balance.annualRemaining}</span>
                            <span className="text-xs text-base-content/30 font-bold">/ {balance.annualAllocation} days remaining</span>
                        </div>
                        <div className="h-2 bg-base-content/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(0, (balance.annualRemaining / balance.annualAllocation) * 100)}%` }} />
                        </div>
                        <p className="text-sm text-base-content/70 mt-2">{balance.annualUsed} days used this year</p>
                    </div>
                    <div className="glass-panel rounded-3xl p-5">
                        <span className="text-xs uppercase font-black tracking-[0.3em] text-base-content/70 block mb-2">Sick Leave</span>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-black text-warning">{balance.sickRemaining}</span>
                            <span className="text-xs text-base-content/30 font-bold">/ {balance.sickAllocation} days remaining</span>
                        </div>
                        <div className="h-2 bg-base-content/5 rounded-full overflow-hidden">
                            <div className="h-full bg-warning rounded-full transition-all duration-500" style={{ width: `${Math.max(0, (balance.sickRemaining / balance.sickAllocation) * 100)}%` }} />
                        </div>
                        <p className="text-sm text-base-content/70 mt-2">{balance.sickUsed} days used this year</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-tight text-base-content flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-warning" /> My Leave Requests
                </h3>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-sm btn-primary gap-2">
                    {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showForm ? 'Cancel' : 'Request Leave'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Leave Type</label>
                            <select className="select select-bordered select-sm w-full" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Start Date</label>
                            <input type="date" className="input input-bordered input-sm w-full" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
                        </div>
                        <div>
                            <label className="text-sm font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">End Date</label>
                            <input type="date" className="input input-bordered input-sm w-full" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Reason</label>
                        <textarea className="textarea textarea-bordered w-full text-sm" rows={2} placeholder="Brief explanation..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
                    </div>
                    <button type="submit" disabled={submitting} className="btn btn-primary btn-sm gap-2">
                        {submitting ? <span className="loading loading-spinner loading-xs" /> : <Send className="w-3.5 h-3.5" />}
                        Submit Request
                    </button>
                </form>
            )}

            <div className="glass-panel rounded-[32px] overflow-hidden border border-base-content/10 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="bg-base-content/5 border-b border-base-content/10">
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Request Type</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Duration</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Status</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Response</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-content/5">
                            {leaves.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-20 text-sm text-base-content/30 italic font-medium">No leave cycles recorded</td>
                                </tr>
                            ) : (
                                leaves.map((l: any) => (
                                    <tr key={l.id} className="hover:bg-base-content/[0.02] transition-colors group">
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black uppercase tracking-widest text-primary mb-0.5">{l.type}</span>
                                                <span className="text-sm font-medium text-base-content/70 line-clamp-1">{l.reason}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-base-content/5 text-base-content/40">
                                                    <Clock className="w-3 h-3" />
                                                </div>
                                                <span className="text-sm font-black tabular-nums italic">
                                                    {format(new Date(l.startDate), 'MMM d')} — {format(new Date(l.endDate), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={cn(
                                                "badge badge-sm font-black text-[10px] uppercase tracking-widest border-none px-3 h-6",
                                                l.status === 'PENDING' ? 'bg-warning/10 text-warning' : l.status === 'APPROVED' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                            )}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td>
                                            {l.reviewNote ? (
                                                <div className="flex items-center gap-2 bg-base-content/5 px-3 py-1.5 rounded-xl border border-base-content/10 w-fit">
                                                    <MessageSquare className="w-3 h-3 text-base-content/30" />
                                                    <span className="text-[11px] font-bold text-base-content/70 max-w-[120px] truncate">{l.reviewNote}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase tracking-widest text-base-content/20 italic">Awaiting...</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// ─── Suggestions/Complaints Tab ───
function SuggestionsTab({ suggestions }: { suggestions: any[] }) {
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ category: 'SUGGESTION', content: '' })
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        try {
            await createSuggestion(form)
            setForm({ category: 'SUGGESTION', content: '' })
            setShowForm(false)
            router.refresh()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-info/10 text-info rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Open Dialogue</h3>
                        <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">Share insights or concerns anonymously</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-sm h-10 px-6 rounded-xl bg-info text-white border-none shadow-lg shadow-info/20 gap-2">
                    {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showForm ? 'Close' : 'New Submission'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="glass-panel rounded-[32px] p-8 space-y-6 border-info/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-info/5 blur-3xl rounded-full -mr-10 -mt-10" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 block ml-1">Classification</label>
                            <select className="select select-bordered h-12 w-full rounded-2xl bg-base-content/5 border-none focus:ring-2 ring-info/20 font-bold" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                {['COMPLAINT', 'REQUEST', 'SUGGESTION', 'FEEDBACK'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 block ml-1">Communication Content</label>
                        <textarea className="textarea textarea-bordered w-full rounded-2xl bg-base-content/5 border-none focus:ring-2 ring-info/20 font-bold text-sm min-h-[120px]" placeholder="Your message will be transmitted securely..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={submitting} className="btn bg-info text-white border-none h-12 px-10 rounded-2xl shadow-lg shadow-info/20 gap-3 font-black uppercase tracking-widest text-xs">
                            {submitting ? <span className="loading loading-spinner" /> : <Send className="w-4 h-4" />}
                            Transmit Anonymously
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 gap-4">
                {suggestions.length === 0 ? (
                    <div className="glass-panel rounded-[32px] py-20 flex flex-col items-center justify-center opacity-40">
                        <MessageSquare size={48} className="mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest italic">No prior transmissions</p>
                    </div>
                ) : (
                    suggestions.map((s: any) => (
                        <div key={s.id} className="glass-panel group p-8 rounded-[32px] hover:border-info/20 transition-all border-transparent">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="badge h-8 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-none bg-info/10 text-info">{s.category}</span>
                                    <span className="text-[10px] font-black text-base-content/30 uppercase tracking-[0.2em]">{format(new Date(s.createdAt), 'MMMM dd, yyyy')}</span>
                                </div>
                                <span className={cn(
                                    "badge h-7 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest border-none w-fit",
                                    s.status === 'OPEN' ? 'bg-warning/10 text-warning' : s.status === 'REVIEWED' ? 'bg-info/10 text-info' : 'bg-success/10 text-success'
                                )}>
                                    {s.status}
                                </span>
                            </div>
                            <p className="text-base font-medium text-base-content/80 leading-relaxed italic border-l-4 border-base-content/10 pl-6 py-1">
                                "{s.content}"
                            </p>
                            {s.adminNote && (
                                <div className="mt-8 bg-primary/5 border border-primary/10 rounded-3xl p-6 relative overflow-hidden group-hover:bg-primary/[0.08] transition-colors">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20" />
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-1.5 bg-primary/10 rounded-lg">
                                            <Shield className="w-4 h-4 text-primary" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">Administrative Resolution</span>
                                    </div>
                                    <p className="text-sm text-base-content/70 font-bold leading-relaxed">{s.adminNote}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

// ─── IT Support Tab ───
function ITSupportTab({ itRequests }: { itRequests: any[] }) {
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ title: '', description: '', priority: 'NORMAL' })
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        try {
            await createITSupportRequest(form)
            setForm({ title: '', description: '', priority: 'NORMAL' })
            setShowForm(false)
            router.refresh()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const priorityStyles: Record<string, string> = {
        LOW: 'bg-base-content/5 text-base-content/50 border-base-content/10',
        NORMAL: 'bg-info/10 text-info border-info/20',
        HIGH: 'bg-warning/10 text-warning border-warning/20',
        URGENT: 'bg-error/10 text-error border-error/50 font-black animate-pulse'
    }

    const statusStyles: Record<string, string> = {
        OPEN: 'bg-warning/10 text-warning',
        IN_PROGRESS: 'bg-primary/10 text-primary',
        RESOLVED: 'bg-success/10 text-success',
        CLOSED: 'bg-base-content/5 text-base-content/40'
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Technical Logistics</h3>
                        <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">Submit and track infrastructure requests</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-sm h-10 px-6 rounded-xl btn-primary gap-2 shadow-lg shadow-primary/20">
                    {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showForm ? 'Cancel' : 'Initiate Request'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="glass-panel rounded-[32px] p-8 space-y-6 border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-10 -mt-10" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 block ml-1">Engagement Title</label>
                            <input type="text" className="input input-bordered h-12 w-full rounded-2xl bg-base-content/5 border-none focus:ring-2 ring-primary/20 font-bold" placeholder="E.g., Virtual Machine Access..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 block ml-1">Priority Matrix</label>
                            <select className="select select-bordered h-12 w-full rounded-2xl bg-base-content/5 border-none focus:ring-2 ring-primary/20 font-bold px-4" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 block ml-1">Technical Context</label>
                        <textarea className="textarea textarea-bordered w-full rounded-2xl bg-base-content/5 border-none focus:ring-2 ring-primary/20 font-bold text-sm min-h-[100px]" placeholder="Detailed description of requirements..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={submitting} className="btn btn-primary h-12 px-10 rounded-2xl shadow-lg shadow-primary/20 gap-3 font-black uppercase tracking-widest text-xs">
                            {submitting ? <span className="loading loading-spinner" /> : <Send className="w-4 h-4" />}
                            Submit Requisition
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {itRequests.length === 0 ? (
                    <div className="col-span-full glass-panel rounded-[32px] py-20 flex flex-col items-center justify-center opacity-40">
                        <Monitor size={48} className="mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest italic">No active logistics</p>
                    </div>
                ) : (
                    itRequests.map((r: any) => (
                        <div key={r.id} className="glass-panel group p-6 rounded-[32px] flex flex-col space-y-4 relative overflow-hidden transition-all hover:scale-[1.02] border-transparent hover:border-primary/20 shadow-sm hover:shadow-xl">
                            <div className={cn("absolute top-0 left-0 w-full h-1.5 opacity-40", r.priority === 'URGENT' ? 'bg-error' : r.priority === 'HIGH' ? 'bg-warning' : 'bg-primary')} />

                            <div className="flex items-center justify-between">
                                <span className={cn("badge h-6 rounded-lg font-black text-[9px] uppercase tracking-widest border", priorityStyles[r.priority])}>
                                    {r.priority}
                                </span>
                                <span className={cn("badge h-6 rounded-lg font-black text-[9px] uppercase tracking-widest border-none", statusStyles[r.status])}>
                                    {r.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="space-y-2 min-h-[80px]">
                                <h4 className="text-sm font-black text-base-content truncate group-hover:text-primary transition-colors uppercase tracking-tight">{r.title}</h4>
                                <p className="text-xs font-medium text-base-content/60 line-clamp-3 leading-relaxed">{r.description}</p>
                            </div>

                            <div className="pt-4 flex items-center justify-between border-t border-base-content/5 mt-auto">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-base-content/30 mb-0.5">Logged</span>
                                    <span className="text-[10px] font-black italic text-base-content/60">{format(new Date(r.createdAt), 'MMM d, HH:mm')}</span>
                                </div>
                                {r.assignedTo ? (
                                    <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-xl">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="w-3 h-3 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black text-primary uppercase">{r.assignedTo.name.split(' ')[0]}</span>
                                    </div>
                                ) : (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-base-content/20 bg-base-content/5 px-2 py-1 rounded-lg">Awaiting Tech</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
// ─── Finance / Requisitions Tab ───
function FinanceTab({ requisitions }: { requisitions: any[] }) {
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [items, setItems] = useState([{ itemName: '', quantity: 1, unitPrice: 0, vatInclusive: false }])
    const [reason, setReason] = useState('')
    const router = useRouter()

    const addItem = () => setItems([...items, { itemName: '', quantity: 1, unitPrice: 0, vatInclusive: false }])
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
            ; (newItems[index] as any)[field] = value
        setItems(newItems)
    }

    const calculateTotal = () => {
        return items.reduce((sum, item) => {
            const lineTotal = item.quantity * item.unitPrice
            return sum + (item.vatInclusive ? lineTotal : lineTotal * 1.16)
        }, 0)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (items.some(i => !i.itemName || i.unitPrice <= 0)) {
            alert('Please fill all item details correctly')
            return
        }
        setSubmitting(true)
        try {
            const res = await createRequisition({ items, reason })
            if (res.success) {
                setItems([{ itemName: '', quantity: 1, unitPrice: 0, vatInclusive: false }])
                setReason('')
                setShowForm(false)
                router.refresh()
            } else {
                alert(res.error)
            }
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-tight text-base-content flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Purchase Requisitions
                </h3>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-sm btn-primary gap-2">
                    {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showForm ? 'Cancel' : 'New Requisition'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 space-y-6 border border-primary/10">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-base-content/10 pb-2">
                            <span className="text-xs font-black uppercase tracking-widest text-base-content/40">Itemized Entries</span>
                            <button type="button" onClick={addItem} className="btn btn-ghost btn-xs text-primary gap-1 font-bold">
                                <Plus className="w-3 h-3" /> Add Item
                            </button>
                        </div>

                        {items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-base-content/5 p-4 rounded-2xl relative group">
                                <div className="md:col-span-5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1 block">Description</label>
                                    <input
                                        type="text"
                                        className="input input-bordered input-sm w-full font-bold"
                                        placeholder="What are we buying?"
                                        value={item.itemName}
                                        onChange={e => updateItem(idx, 'itemName', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1 block">Qty</label>
                                    <input
                                        type="number"
                                        className="input input-bordered input-sm w-full font-bold"
                                        min="1"
                                        value={item.quantity}
                                        onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1 block">Unit Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input input-bordered input-sm w-full font-bold"
                                        placeholder="0.00"
                                        value={item.unitPrice}
                                        onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value))}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2 pb-2 flex flex-col items-center">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1 block">Incl. VAT</label>
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary checkbox-sm"
                                        checked={item.vatInclusive}
                                        onChange={e => updateItem(idx, 'vatInclusive', e.target.checked)}
                                    />
                                </div>
                                <div className="md:col-span-1 pb-1">
                                    {items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(idx)} className="btn btn-ghost btn-xs text-error">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-base-content/10">
                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-base-content/30 block mb-2">Internal Reason / Reference</label>
                            <textarea
                                className="textarea textarea-bordered w-full text-sm font-medium"
                                rows={2}
                                placeholder="Why is this purchase required?"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>
                        <div className="bg-primary/5 rounded-2xl p-6 flex flex-col justify-center items-end border border-primary/10">
                            <div className="flex items-center gap-2 text-primary/60 mb-1">
                                <Calculator className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-widest">Estimated Total</span>
                            </div>
                            <span className="text-3xl font-black text-primary tabular-nums">
                                KES {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <p className="text-[10px] font-bold text-base-content/40 mt-1 uppercase tracking-tighter">* Non-inclusive items auto-calculated with 16% VAT</p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={submitting} className="btn btn-primary gap-2 shadow-lg shadow-primary/20">
                            {submitting ? <span className="loading loading-spinner" /> : <Send className="w-4 h-4" />}
                            Submit Requisition
                        </button>
                    </div>
                </form>
            )}

            <div className="glass-panel rounded-3xl overflow-hidden border border-base-content/10">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="bg-base-content/5 border-b border-base-content/10">
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Req ID</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Items</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40 text-right">Total Amount</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Status</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-content/5">
                            {requisitions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 text-sm text-base-content/30 italic font-medium">No requisitions found</td>
                                </tr>
                            ) : (
                                requisitions.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-base-content/[0.02] transition-colors">
                                        <td className="font-black text-xs text-base-content/40">#REQ-{r.id.toString().padStart(4, '0')}</td>
                                        <td>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-base-content">{r.items[0]?.itemName}</span>
                                                {r.items.length > 1 && (
                                                    <span className="text-[10px] font-black text-primary uppercase">+{r.items.length - 1} more items</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-right font-black tabular-nums text-sm">
                                            KES {r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td>
                                            <span className={cn(
                                                "badge badge-sm font-black text-[10px] uppercase tracking-widest border-none px-2.5 h-6",
                                                r.status === 'PENDING' ? 'bg-warning/10 text-warning' :
                                                    r.status === 'APPROVED' ? 'bg-success/10 text-success' :
                                                        r.status === 'SENT_FOR_REVIEW' ? 'bg-info/10 text-info' : 'bg-error/10 text-error'
                                            )}>
                                                {r.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="text-xs font-bold text-base-content/60">
                                            {format(new Date(r.createdAt), 'MMM d, h:mm a')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
