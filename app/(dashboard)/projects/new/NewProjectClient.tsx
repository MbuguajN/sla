'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Folder, Save } from 'lucide-react'
import Link from 'next/link'

interface NewProjectClientProps {
    userDepartment: string | undefined
}

export default function NewProjectClient({ userDepartment }: NewProjectClientProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        slaName: '',
        slaDurationHrs: '24',
        slaTier: 'STANDARD'
    })

    // Visual feedback if someone forced their way here
    if (userDepartment !== 'BUSINESS_DEVELOPMENT') {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center">
                    <Folder className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h1>
                <p className="max-w-md opacity-60 font-medium italic">
                    Project initialization is restricted to the Business Development department per strategic protocol.
                </p>
                <Link href="/projects" className="btn btn-outline btn-sm uppercase font-black tracking-widest text-[10px] mt-4">
                    Return to Fleet
                </Link>
            </div>
        )
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                router.push('/projects')
                router.refresh()
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to create project')
            }
        } catch (err) {
            console.error(err)
            alert('Error creating project')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link href="/projects" className="btn btn-ghost btn-sm gap-2 uppercase font-black text-[10px] tracking-widest opacity-60">
                    <ArrowLeft className="w-3 h-3" />
                    Back to Fleet
                </Link>
            </div>

            <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                    <Folder className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-base-content tracking-tighter uppercase">Client Onboarding</h1>
                    <p className="text-sm font-medium text-base-content/60 italic">Initialize a new strategic project shell and define service parameters.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="card bg-base-100 shadow-xl border border-base-200">
                        <div className="card-body p-8 space-y-6">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60 mb-2">Project Identity</h2>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-black text-[10px] uppercase tracking-wider opacity-60">Client / Project Name</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Global Redesign 2024"
                                    className="input input-bordered w-full font-bold text-sm bg-base-200/30 border-base-300 focus:border-primary"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-black text-[10px] uppercase tracking-wider opacity-60">Strategic Description</span>
                                </label>
                                <textarea
                                    required
                                    placeholder="Outline the core objectives and project scope..."
                                    className="textarea textarea-bordered h-40 w-full font-medium text-sm bg-base-200/30 border-base-300 focus:border-primary"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-8">
                    <div className="card bg-base-100 shadow-xl border border-warning/20 overflow-hidden">
                        <div className="bg-warning/5 p-6 border-b border-warning/10">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-warning">Automatic SLA Proxy</h2>
                            <p className="text-[10px] font-bold opacity-60 mt-1">Define the default response protocols for this client.</p>
                        </div>
                        <div className="card-body p-6 space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-black text-[10px] uppercase tracking-wider opacity-60">SLA Alias</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Standard 5DM"
                                    className="input input-bordered input-sm font-bold bg-base-200/30"
                                    value={formData.slaName}
                                    onChange={(e) => setFormData({ ...formData, slaName: e.target.value })}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-black text-[10px] uppercase tracking-wider opacity-60">Turnaround (Hours)</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="24"
                                    className="input input-bordered input-sm font-bold bg-base-200/30"
                                    value={formData.slaDurationHrs}
                                    onChange={(e) => setFormData({ ...formData, slaDurationHrs: e.target.value })}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-black text-[10px] uppercase tracking-wider opacity-60">Priority Tier</span>
                                </label>
                                <select
                                    className="select select-bordered select-sm font-bold bg-base-200/30"
                                    value={formData.slaTier}
                                    onChange={(e) => setFormData({ ...formData, slaTier: e.target.value })}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="STANDARD">Standard</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !formData.title.trim()}
                        className="btn btn-primary btn-block shadow-lg gap-2 h-14 uppercase font-black text-[12px] tracking-widest"
                    >
                        {loading ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Initialize Project
                    </button>

                    <Link href="/projects" className="btn btn-ghost btn-block btn-sm uppercase font-black text-[10px] tracking-widest opacity-40">
                        Abort Mission
                    </Link>
                </div>
            </form>
        </div>
    )
}
