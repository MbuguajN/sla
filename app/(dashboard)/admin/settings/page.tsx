'use client'

import React, { useState, useEffect } from 'react'
import { uploadLogo, getSystemSettings, saveSystemSettings } from '@/app/actions/settingsActions'
import { Upload, CheckCircle2, AlertCircle, Sun, Moon, Heart, Shield, Monitor, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState('branding')

    const tabs = [
        { id: 'branding', label: 'Branding', icon: Settings2 },
        { id: 'hr', label: 'HR & People', icon: Heart },
        { id: 'it', label: 'IT Support', icon: Monitor },
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-base-content">System Settings</h1>
                <p className="text-[11px] font-bold text-base-content/30 uppercase tracking-[0.2em] mt-1">Administration & Configuration</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1.5 bg-base-content/5 rounded-2xl w-fit">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                            activeTab === t.id
                                ? "bg-white dark:bg-primary/10 text-primary shadow-sm"
                                : "text-base-content/30 hover:text-base-content/50"
                        )}
                    >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'branding' && <BrandingTab />}
            {activeTab === 'hr' && <HRTab />}
            {activeTab === 'it' && <ITTab />}
        </div>
    )
}

// ─── Branding Tab ───
function BrandingTab() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-black tracking-tight uppercase text-base-content">System Branding</h2>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Visual Identity Management</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LogoUploader
                    type="SYSTEM_LOGO_LIGHT"
                    title="Light Mode Logo"
                    description="Displayed on light backgrounds. Recommended: Dark or colored logo."
                    icon={<Sun className="w-4 h-4 text-warning" />}
                />
                <LogoUploader
                    type="SYSTEM_LOGO_DARK"
                    title="Dark Mode Logo"
                    description="Displayed on dark backgrounds. Recommended: White or light-colored logo."
                    icon={<Moon className="w-4 h-4 text-primary" />}
                />
            </div>
        </div>
    )
}

// ─── HR Tab ───
function HRTab() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-black tracking-tight uppercase text-base-content">HR & People Management</h2>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Leave tracking, suggestions, and employee management</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/hr" className="glass-panel group p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-primary/20 border border-transparent transition-all hover:scale-[1.02]">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Heart className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">HR Dashboard</h3>
                        <p className="text-[10px] text-base-content/30 mt-1">View employee attendance, stats, and overview</p>
                    </div>
                </Link>

                <Link href="/hr/leaves" className="glass-panel group p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-warning/20 border border-transparent transition-all hover:scale-[1.02]">
                    <div className="w-14 h-14 bg-warning/10 rounded-2xl flex items-center justify-center">
                        <Shield className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Leave Tracker</h3>
                        <p className="text-[10px] text-base-content/30 mt-1">Approve or deny employee leave requests</p>
                    </div>
                </Link>

                <Link href="/hr/suggestions" className="glass-panel group p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-info/20 border border-transparent transition-all hover:scale-[1.02]">
                    <div className="w-14 h-14 bg-info/10 rounded-2xl flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-info" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Suggestion Box</h3>
                        <p className="text-[10px] text-base-content/30 mt-1">View employee suggestions and complaints</p>
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-base-content/30 block mb-2">
                        Max Annual Leave Days
                    </label>
                    <input
                        type="number"
                        className="input input-bordered input-sm w-full max-w-xs"
                        value={maxLeaveDays}
                        onChange={e => setMaxLeaveDays(e.target.value)}
                    />
                    <p className="text-[9px] text-base-content/20 mt-1">Default maximum leave allocation per employee per year</p>
                </div>
            </div>
            {message && (
                <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest py-2 px-3 rounded-lg", message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>
                    {message.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {message.text}
                </div>
            )}
            <button onClick={handleSave} disabled={loading} className="btn btn-primary btn-sm font-black uppercase tracking-widest text-[10px]">
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
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Technical support request management</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/it-support" className="glass-panel group p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-primary/20 border border-transparent transition-all hover:scale-[1.02]">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-base-content">IT Support Queue</h3>
                        <p className="text-[10px] text-base-content/30 mt-1">View and manage all IT support tickets</p>
                    </div>
                </Link>

                <div className="glass-panel p-8 rounded-3xl space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-base-content">Support Routing</h3>
                    <p className="text-[10px] text-base-content/30 leading-relaxed">
                        IT Support requests submitted by employees are automatically routed to the <strong className="text-primary">Technology Department</strong>.
                        Any member of the technology team can assign and resolve tickets.
                    </p>
                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Auto-routed to TECHNOLOGY dept</span>
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
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-wider leading-relaxed mb-6">
                    {description}
                </p>

                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-base-content/10 rounded-2xl p-6 hover:bg-base-content/[0.02] transition-colors">
                        {preview ? (
                            <div className="mb-4 bg-base-content/5 p-4 rounded-xl flex items-center justify-center min-h-[80px] w-full">
                                <img src={preview} alt="Preview" className="h-12 object-contain" />
                            </div>
                        ) : (
                            <div className="w-12 h-12 bg-base-content/5 rounded-full flex items-center justify-center mb-4 text-base-content/20">
                                <Upload className="w-6 h-6" />
                            </div>
                        )}

                        <input
                            type="file"
                            name="file"
                            accept="image/*"
                            className="file-input file-input-bordered file-input-xs w-full max-w-xs font-bold uppercase tracking-widest text-[9px]"
                            onChange={handleFileChange}
                            required
                        />
                    </div>

                    {message && (
                        <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest py-2 px-3 rounded-lg", message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>
                            {message.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm font-black uppercase tracking-widest text-[10px] h-9 min-h-9 px-6"
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
