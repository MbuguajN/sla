'use client'

import React, { useState, useEffect } from 'react'
import { uploadLogo, getSystemSettings, saveSystemSettings, purgeCache } from '@/app/actions/settingsActions'
import { Upload, CheckCircle2, AlertCircle, Sun, Moon, Heart, Shield, Monitor, Settings2, Users2, Activity, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { LimelightNav } from '@/components/ui/limelight-nav'

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState('branding')

    const tabs = [
        { id: 'branding', label: 'Branding', icon: <Settings2 /> },
        { id: 'hr', label: 'HR & People', icon: <Heart /> },
        { id: 'it', label: 'IT Support', icon: <Monitor /> },
        { id: 'health', label: 'System Health', icon: <Activity /> },
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-base-content">System Settings</h1>
                <p className="text-sm font-bold text-base-content/30 uppercase tracking-[0.2em] mt-1">Administration & Configuration</p>
            </div>

            {/* Tab Navigation */}
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
                {activeTab === 'branding' && <BrandingTab />}
                {activeTab === 'hr' && <HRTab />}
                {activeTab === 'it' && <ITTab />}
                {activeTab === 'health' && <HealthTab />}
            </div>
        </div>
    )
}

// ─── Branding Tab ───
function BrandingTab() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight uppercase text-base-content">System Branding</h2>
                    <p className="text-sm font-bold opacity-40 uppercase tracking-widest mt-1">Visual Identity Management</p>
                </div>
                <div className="bg-primary/5 rounded-2xl px-4 py-2 border border-primary/10 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Operational Branding Authority</span>
                </div>
            </div>

            <div className="glass-panel rounded-[32px] p-8 md:p-12 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                                <Sun className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-tight">Light Mode Logo</h3>
                                <p className="text-[10px] font-bold opacity-40 uppercase tracking-wider">Visible on White/Light surfaces</p>
                            </div>
                        </div>
                        <LogoUploaderSmall
                            type="SYSTEM_LOGO_LIGHT"
                            description="Recommended: Dark logo on transparent background."
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                <Moon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-tight">Dark Mode Logo</h3>
                                <p className="text-[10px] font-bold opacity-40 uppercase tracking-wider">Visible on Dark/Glass surfaces</p>
                            </div>
                        </div>
                        <LogoUploaderSmall
                            type="SYSTEM_LOGO_DARK"
                            description="Recommended: White logo on transparent background."
                        />
                    </div>
                </div>

                <div className="pt-8 border-t border-base-content/5 flex items-center gap-4">
                    <AlertCircle className="w-5 h-5 text-info" />
                    <p className="text-xs font-bold text-base-content/40 leading-relaxed uppercase tracking-wide">
                        Logo changes are cached globally. If and when you update a logo, trigger a <strong className="text-base-content underline decoration-primary underline-offset-4">Cache Purge</strong> below to force immediate propagation across all client sessions.
                    </p>
                </div>
            </div>
        </div>
    )
}

function LogoUploaderSmall({ type, description }: { type: string, description: string }) {
    const [isUploading, setIsUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [preview, setPreview] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setPreview(URL.createObjectURL(file))
        }
    }

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsUploading(true)
        setMessage(null)

        const formData = new FormData(e.currentTarget)
        formData.append('type', type)

        try {
            const result = await uploadLogo(formData)
            if (result.success) {
                setMessage({ type: 'success', text: 'Propagated' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Link error' })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <form onSubmit={handleUpload} className="space-y-4">
            <div className="group relative flex flex-col items-center justify-center border-2 border-dashed border-base-content/10 rounded-2xl p-6 hover:bg-base-content/[0.02] transition-all hover:border-primary/20">
                {preview ? (
                    <div className="bg-base-content/5 p-4 rounded-xl flex items-center justify-center min-h-[60px] w-full">
                        <img src={preview} alt="Preview" className="h-10 object-contain" />
                    </div>
                ) : (
                    <div className="w-10 h-10 bg-base-content/5 rounded-full flex items-center justify-center text-base-content/40">
                        <Upload className="w-5 h-5" />
                    </div>
                )}

                <input
                    type="file"
                    name="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    required
                />
                {!preview && <p className="text-[9px] font-black uppercase tracking-widest text-base-content/30 mt-3 group-hover:text-primary transition-colors">Select Asset</p>}
            </div>

            <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-base-content/30 leading-tight flex-1 italic">{description}</p>
                <button
                    type="submit"
                    className="btn btn-primary btn-xs h-8 px-4 font-black uppercase tracking-widest text-[10px] rounded-lg shadow-lg shadow-primary/20"
                    disabled={isUploading}
                >
                    {isUploading ? <span className="loading loading-spinner loading-[10px]"></span> : 'Upload'}
                </button>
            </div>

            {message && (
                <div className={cn("text-[9px] font-black uppercase tracking-[0.2em] py-1 text-center", message.type === 'success' ? 'text-success' : 'text-error')}>
                    {message.text}
                </div>
            )}
        </form>
    )
}

// ─── HR Tab ───
function HRTab() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-black tracking-tight uppercase text-base-content">HR & People Management</h2>
                <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Leave tracking, suggestions, and employee management</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/hr" className="glass-panel group p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-primary/20 border border-transparent transition-all hover:scale-[1.02]">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Heart className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">HR Dashboard</h3>
                        <p className="text-sm text-base-content/30 mt-1">View employee attendance, stats, and overview</p>
                    </div>
                </Link>

                <Link href="/hr/leaves" className="glass-panel group p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-warning/20 border border-transparent transition-all hover:scale-[1.02]">
                    <div className="w-14 h-14 bg-warning/10 rounded-2xl flex items-center justify-center">
                        <Shield className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Leave Tracker</h3>
                        <p className="text-sm text-base-content/30 mt-1">Approve or deny employee leave requests</p>
                    </div>
                </Link>

                <Link href="/hr/suggestions" className="glass-panel group p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-info/20 border border-transparent transition-all hover:scale-[1.02]">
                    <div className="w-14 h-14 bg-info/10 rounded-2xl flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-info" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Suggestion Box</h3>
                        <p className="text-sm text-base-content/30 mt-1">View employee suggestions and complaints</p>
                    </div>
                </Link>

                <Link href="/admin/users" className="glass-panel group p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-secondary/20 border border-transparent transition-all hover:scale-[1.02]">
                    <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center">
                        <Users2 className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Directory</h3>
                        <p className="text-sm text-base-content/30 mt-1">Manage personnel and organizational structure</p>
                    </div>
                </Link>
            </div>

            <HRSettingsForm />
        </div>
    )
}

function HRSettingsForm() {
    const [maxLeaveDays, setMaxLeaveDays] = useState('21')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        getSystemSettings(['HR_MAX_ANNUAL_LEAVE']).then(s => {
            if (s['HR_MAX_ANNUAL_LEAVE']) setMaxLeaveDays(s['HR_MAX_ANNUAL_LEAVE'])
        })
    }, [])

    async function handleSave() {
        setLoading(true)
        setMessage(null)
        try {
            const result = await saveSystemSettings({ HR_MAX_ANNUAL_LEAVE: maxLeaveDays })
            if (result.success) {
                setMessage({ type: 'success', text: 'Settings saved' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed' })
            }
        } catch {
            setMessage({ type: 'error', text: 'Save failed' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-panel rounded-3xl p-8 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Leave Policy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-sm font-black uppercase tracking-widest text-base-content/30 block mb-2">
                        Max Annual Leave Days
                    </label>
                    <input
                        type="number"
                        className="input input-bordered input-sm w-full max-w-xs"
                        value={maxLeaveDays}
                        onChange={e => setMaxLeaveDays(e.target.value)}
                    />
                    <p className="text-xs text-base-content/70 mt-1">Default maximum leave allocation per employee per year</p>
                </div>
            </div>
            {message && (
                <div className={cn("flex items-center gap-2 text-sm font-bold uppercase tracking-widest py-2 px-3 rounded-lg", message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>
                    {message.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {message.text}
                </div>
            )}
            <button onClick={handleSave} disabled={loading} className="btn btn-primary btn-sm font-black uppercase tracking-widest text-sm">
                {loading ? <span className="loading loading-spinner loading-xs" /> : 'Save Settings'}
            </button>
        </div>
    )
}

// ─── IT Tab ───
function ITTab() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-black tracking-tight uppercase text-base-content">IT Support Configuration</h2>
                <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Technical support request management</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/it-support" className="glass-panel group p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-primary/20 border border-transparent transition-all hover:scale-[1.02]">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">IT Support Queue</h3>
                        <p className="text-sm text-base-content/30 mt-1">View and manage all IT support tickets</p>
                    </div>
                </Link>

                <div className="glass-panel p-8 rounded-3xl space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Support Routing</h3>
                    <p className="text-sm text-base-content/30 leading-relaxed">
                        IT Support requests submitted by employees are automatically routed to the <strong className="text-primary">Technology Department</strong>.
                        Any member of the technology team can assign and resolve tickets.
                    </p>
                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-primary uppercase tracking-wider">Auto-routed to TECHNOLOGY dept</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Logo Uploader Component ───
function LogoUploader({ type, title, description, icon }: { type: string, title: string, description: string, icon: React.ReactNode }) {
    const [isUploading, setIsUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [preview, setPreview] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setPreview(URL.createObjectURL(file))
        }
    }

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsUploading(true)
        setMessage(null)

        const formData = new FormData(e.currentTarget)
        formData.append('type', type)

        try {
            const result = await uploadLogo(formData)
            if (result.success) {
                setMessage({ type: 'success', text: 'Logo updated successfully' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Upload failed' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Connection failure' })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="glass-panel rounded-3xl overflow-hidden">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <h3 className="font-black text-sm uppercase tracking-tight">{title}</h3>
                </div>
                <p className="text-sm font-bold opacity-40 uppercase tracking-wider leading-relaxed mb-6">
                    {description}
                </p>

                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-base-content/10 rounded-2xl p-6 hover:bg-base-content/[0.02] transition-colors">
                        {preview ? (
                            <div className="mb-4 bg-base-content/5 p-4 rounded-xl flex items-center justify-center min-h-[80px] w-full">
                                <img src={preview} alt="Preview" className="h-12 object-contain" />
                            </div>
                        ) : (
                            <div className="w-12 h-12 bg-base-content/5 rounded-full flex items-center justify-center mb-4 text-base-content/70">
                                <Upload className="w-6 h-6" />
                            </div>
                        )}

                        <input
                            type="file"
                            name="file"
                            accept="image/*"
                            className="file-input file-input-bordered file-input-xs w-full max-w-xs font-bold uppercase tracking-widest text-xs"
                            onChange={handleFileChange}
                            required
                        />
                    </div>

                    {message && (
                        <div className={cn("flex items-center gap-2 text-sm font-bold uppercase tracking-widest py-2 px-3 rounded-lg", message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>
                            {message.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm font-black uppercase tracking-widest text-sm h-9 min-h-9 px-6"
                            disabled={isUploading}
                        >
                            {isUploading ? <span className="loading loading-spinner loading-xs"></span> : 'Update Logo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Health Tab ───
function HealthTab() {
    const [purging, setPurging] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    async function handlePurge() {
        setPurging(true)
        setMsg(null)
        try {
            const res = await purgeCache()
            if (res.success) {
                setMsg({ type: 'success', text: 'Operational cache purged across all vectors' })
            } else {
                setMsg({ type: 'error', text: res.error || 'Purge failed' })
            }
        } catch {
            setMsg({ type: 'error', text: 'Connection failure' })
        } finally {
            setPurging(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-black tracking-tight uppercase text-base-content">System Performance & Health</h2>
                <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Global cache and state management</p>
            </div>

            <div className="glass-panel p-10 rounded-[32px] border border-transparent hover:border-primary/10 transition-all flex flex-col md:flex-row items-center gap-10">
                <div className="w-24 h-24 bg-primary/5 rounded-[32px] flex items-center justify-center shrink-0">
                    <Activity className="w-12 h-12 text-primary opacity-40" />
                </div>
                <div className="space-y-4 flex-1">
                    <h3 className="text-xl font-black text-base-content uppercase tracking-tight">System Cache Recalibration</h3>
                    <p className="text-sm text-base-content/60 leading-relaxed font-medium">
                        If the system feels sluggish or data appears stale, triggering a global cache purge forces
                        the operational matrix to refetch and revalidate all server-side paths. Use this as a
                        primary troubleshooting step for perceived latency.
                    </p>
                    {msg && (
                        <div className={cn("flex items-center gap-2 text-sm font-black uppercase tracking-widest py-3 px-4 rounded-xl", msg.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>
                            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {msg.text}
                        </div>
                    )}
                    <button
                        onClick={handlePurge}
                        disabled={purging}
                        className="btn btn-primary h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 gap-3 font-black uppercase tracking-widest text-xs"
                    >
                        {purging ? <span className="loading loading-spinner" /> : <RefreshCw className="w-4 h-4" />}
                        Purge All Operational Buffers
                    </button>
                </div>
            </div>
        </div>
    )
}
