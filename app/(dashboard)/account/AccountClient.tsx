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
    Camera, Lock, Eye, EyeOff, Pencil, Activity
} from 'lucide-react'
import { LimelightNav } from '@/components/ui/limelight-nav'

type AccountClientProps = {
    user: any
    leaves: any[]
    suggestions: any[]
    itRequests: any[]
}

export default function AccountClient({ user, leaves, suggestions, itRequests }: AccountClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('profile')

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <User /> },
        { id: 'leave', label: 'Leave', icon: <CalendarDays /> },
        { id: 'suggestions', label: 'Suggestions', icon: <MessageSquare /> },
        { id: 'it', label: 'IT Support', icon: <Monitor /> },
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
                <p className="text-sm text-base-content/40 mt-0.5">{user.email}</p>
                <div className="flex items-center gap-3 mt-2 justify-center md:justify-start">
                    <span className="badge badge-sm bg-primary/10 text-primary border-none font-bold text-[10px] uppercase tracking-wider">{user.role}</span>
                    {user.department && (
                        <span className="badge badge-sm bg-base-content/5 text-base-content/40 border-none font-bold text-[10px] uppercase tracking-wider">{user.department.name}</span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-success font-bold uppercase tracking-wider">
                        <Activity className="w-3 h-3" /> Active
                    </span>
                </div>
            </div>
            <div className="md:ml-auto text-center md:text-right">
                <p className="text-[9px] font-bold uppercase tracking-widest text-base-content/20">Member Since</p>
                <p className="text-sm font-bold text-base-content/50">{user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '—'}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-base-content/20 mt-2">Last Active</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Avatar Upload */}
            <div className="glass-panel rounded-3xl p-8 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-tight text-base-content flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" /> Profile Picture
                </h3>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-28 h-28 rounded-3xl bg-primary/10 flex items-center justify-center overflow-hidden ring-4 ring-primary/10">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl font-black text-primary">{user.name?.charAt(0) || '?'}</span>
                        )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarUploading}
                        className="btn btn-sm btn-primary gap-2"
                    >
                        {avatarUploading ? <span className="loading loading-spinner loading-xs" /> : <Camera className="w-3.5 h-3.5" />}
                        {avatarUploading ? 'Uploading...' : 'Change Photo'}
                    </button>
                </div>
            </div>

            {/* Password Reset */}
            <div className="glass-panel rounded-3xl p-8 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-tight text-base-content flex items-center gap-2">
                    <Lock className="w-4 h-4 text-warning" /> Change Password
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-base-content/30 block mb-1.5">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="input input-bordered input-sm w-full pr-10"
                                placeholder="Min 6 characters"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-primary">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-base-content/30 block mb-1.5">Confirm Password</label>
                        <input
                            type="password"
                            className="input input-bordered input-sm w-full"
                            placeholder="Repeat password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    {msg && (
                        <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest py-2 px-3 rounded-lg",
                            msg.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>
                            {msg.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {msg.text}
                        </div>
                    )}
                    <button onClick={handlePasswordReset} disabled={saving} className="btn btn-sm btn-warning text-white gap-2">
                        {saving ? <span className="loading loading-spinner loading-xs" /> : <Lock className="w-3.5 h-3.5" />}
                        Update Password
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
                        <span className="text-[9px] uppercase font-black tracking-[0.3em] text-base-content/20 block mb-2">Annual Leave</span>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-black text-primary">{balance.annualRemaining}</span>
                            <span className="text-xs text-base-content/30 font-bold">/ {balance.annualAllocation} days remaining</span>
                        </div>
                        <div className="h-2 bg-base-content/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(0, (balance.annualRemaining / balance.annualAllocation) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-base-content/20 mt-2">{balance.annualUsed} days used this year</p>
                    </div>
                    <div className="glass-panel rounded-3xl p-5">
                        <span className="text-[9px] uppercase font-black tracking-[0.3em] text-base-content/20 block mb-2">Sick Leave</span>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-black text-warning">{balance.sickRemaining}</span>
                            <span className="text-xs text-base-content/30 font-bold">/ {balance.sickAllocation} days remaining</span>
                        </div>
                        <div className="h-2 bg-base-content/5 rounded-full overflow-hidden">
                            <div className="h-full bg-warning rounded-full transition-all duration-500" style={{ width: `${Math.max(0, (balance.sickRemaining / balance.sickAllocation) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-base-content/20 mt-2">{balance.sickUsed} days used this year</p>
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
                            <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Leave Type</label>
                            <select className="select select-bordered select-sm w-full" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Start Date</label>
                            <input type="date" className="input input-bordered input-sm w-full" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">End Date</label>
                            <input type="date" className="input input-bordered input-sm w-full" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Reason</label>
                        <textarea className="textarea textarea-bordered w-full text-sm" rows={2} placeholder="Brief explanation..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
                    </div>
                    <button type="submit" disabled={submitting} className="btn btn-primary btn-sm gap-2">
                        {submitting ? <span className="loading loading-spinner loading-xs" /> : <Send className="w-3.5 h-3.5" />}
                        Submit Request
                    </button>
                </form>
            )}

            <div className="glass-panel rounded-3xl overflow-hidden divide-y divide-base-content/5">
                {leaves.length === 0 ? (
                    <div className="text-center py-16 text-sm text-base-content/30 italic">No leave requests yet</div>
                ) : (
                    leaves.map((l: any) => (
                        <div key={l.id} className="group p-4 px-6 flex items-center justify-between hover:bg-base-content/[0.02] transition-colors">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{l.type}</span>
                                    <div className="flex items-center gap-2">
                                        <CalendarOff className="w-3.5 h-3.5 text-base-content/20" />
                                        <p className="text-sm font-bold text-base-content">
                                            {format(new Date(l.startDate), 'MMM d')} — {format(new Date(l.endDate), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                    <p className="text-[11px] text-base-content/40 mt-1 line-clamp-1 max-w-[400px]">{l.reason}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={cn(
                                    "badge badge-sm font-bold text-[9px] uppercase tracking-widest border-none px-3 h-6",
                                    l.status === 'PENDING' ? 'bg-warning/10 text-warning' : l.status === 'APPROVED' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                )}>
                                    {l.status === 'PENDING' && <Clock className="w-2.5 h-2.5 mr-1" />}
                                    {l.status === 'APPROVED' && <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
                                    {l.status === 'DENIED' && <XCircle className="w-2.5 h-2.5 mr-1" />}
                                    {l.status}
                                </span>
                                {l.reviewNote && (
                                    <div className="hidden md:flex items-center gap-2 bg-base-content/5 px-3 py-1.5 rounded-xl border border-base-content/5">
                                        <MessageSquare className="w-3 h-3 text-base-content/30" />
                                        <span className="text-[10px] text-base-content/40 font-medium max-w-[150px] truncate">{l.reviewNote}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-tight text-base-content flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-info" /> Suggestions & Complaints
                </h3>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-sm btn-info text-white gap-2">
                    {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showForm ? 'Cancel' : 'New Submission'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 space-y-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Category</label>
                        <select className="select select-bordered select-sm w-full md:w-60" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                            {['COMPLAINT', 'REQUEST', 'SUGGESTION', 'FEEDBACK'].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Your Message</label>
                        <textarea className="textarea textarea-bordered w-full text-sm" rows={3} placeholder="Speak freely — this is anonymous to everyone except the admin..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
                    </div>
                    <button type="submit" disabled={submitting} className="btn btn-info btn-sm gap-2 text-white">
                        {submitting ? <span className="loading loading-spinner loading-xs" /> : <Send className="w-3.5 h-3.5" />}
                        Submit Anonymously
                    </button>
                </form>
            )}

            <div className="glass-panel rounded-3xl overflow-hidden divide-y divide-base-content/5">
                {suggestions.length === 0 ? (
                    <div className="text-center py-16 text-sm text-base-content/30 italic">No submissions yet</div>
                ) : (
                    suggestions.map((s: any) => (
                        <div key={s.id} className="group p-6 hover:bg-base-content/[0.01] transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="badge badge-sm font-black text-[9px] uppercase tracking-widest border-none bg-info/10 text-info px-2.5 h-6">{s.category}</span>
                                    <span className="text-[10px] font-bold text-base-content/20 uppercase tracking-widest">{format(new Date(s.createdAt), 'MMM d, yyyy')}</span>
                                </div>
                                <span className={cn(
                                    "badge badge-sm font-bold text-[9px] uppercase tracking-widest border-none px-3 h-6 w-fit",
                                    s.status === 'OPEN' ? 'bg-warning/10 text-warning' : s.status === 'REVIEWED' ? 'bg-info/10 text-info' : 'bg-success/10 text-success'
                                )}>
                                    {s.status}
                                </span>
                            </div>
                            <p className="text-sm text-base-content/70 leading-relaxed italic">"{s.content}"</p>
                            {s.adminNote && (
                                <div className="mt-5 bg-primary/5 border border-primary/10 rounded-2xl p-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Shield className="w-3 h-3 text-primary opacity-60" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Official Response</span>
                                    </div>
                                    <p className="text-xs text-base-content/80 font-medium">{s.adminNote}</p>
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
        LOW: 'bg-base-content/5 text-base-content/40',
        NORMAL: 'bg-info/10 text-info',
        HIGH: 'bg-warning/10 text-warning',
        URGENT: 'bg-error text-white shadow-sm'
    }

    const statusStyles: Record<string, string> = {
        OPEN: 'bg-warning/10 text-warning',
        IN_PROGRESS: 'bg-primary/10 text-primary',
        RESOLVED: 'bg-success/10 text-success',
        CLOSED: 'bg-base-content/5 text-base-content/40'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-tight text-base-content flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" /> IT Support Requests
                </h3>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-sm btn-primary gap-2">
                    {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showForm ? 'Cancel' : 'New Request'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Title</label>
                            <input type="text" className="input input-bordered input-sm w-full" placeholder="Brief title..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Priority</label>
                            <select className="select select-bordered select-sm w-full" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 block mb-1.5">Description</label>
                        <textarea className="textarea textarea-bordered w-full text-sm" rows={3} placeholder="Describe the issue..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                    </div>
                    <button type="submit" disabled={submitting} className="btn btn-primary btn-sm gap-2">
                        {submitting ? <span className="loading loading-spinner loading-xs" /> : <Send className="w-3.5 h-3.5" />}
                        Submit Request
                    </button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {itRequests.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-sm text-base-content/30 italic">No IT support requests</div>
                ) : (
                    itRequests.map((r: any) => (
                        <div key={r.id} className="glass-panel group p-5 rounded-2xl flex flex-col space-y-3 relative overflow-hidden transition-all hover:scale-[1.01] border border-transparent hover:border-primary/10">
                            <div className={cn("absolute top-0 left-0 w-full h-1", r.priority === 'URGENT' ? 'bg-error' : r.priority === 'HIGH' ? 'bg-warning' : 'bg-primary/20')} />

                            <div className="flex items-start justify-between">
                                <span className={cn("badge badge-sm font-bold text-[9px] uppercase tracking-wider border-none", priorityStyles[r.priority])}>
                                    {r.priority}
                                </span>
                                <span className={cn("badge badge-sm font-bold text-[9px] uppercase tracking-wider border-none", statusStyles[r.status])}>
                                    {r.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-base-content truncate group-hover:text-primary transition-colors">{r.title}</h4>
                                <p className="text-[11px] text-base-content/50 line-clamp-2">{r.description}</p>
                            </div>

                            <div className="pt-3 flex items-center justify-between border-t border-base-content/5 mt-auto">
                                <span className="text-[9px] text-base-content/20 font-bold uppercase tracking-widest">{format(new Date(r.createdAt), 'MMM d, HH:mm')}</span>
                                {r.assignedTo && (
                                    <div className="flex items-center gap-1.5 text-[9px] text-primary font-bold">
                                        <User className="w-3 h-3" />
                                        <span>{r.assignedTo.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
