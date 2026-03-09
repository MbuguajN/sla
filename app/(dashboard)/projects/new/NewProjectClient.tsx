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
                    Project creation is restricted to the Business Development department.
                </p>
                <Link href="/projects" className="btn btn-outline btn-sm uppercase font-black tracking-widest text-sm mt-4">
                    Back to Projects
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
        <div className="min-h-[calc(100vh-4rem)] bg-base-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans -mt-8">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-primary/[0.03] to-transparent" />
                <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-primary/5 blur-[100px] rounded-full animate-pulse" />
                <div className="absolute bottom-[20%] right-[10%] w-[30rem] h-[30rem] bg-secondary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="max-w-4xl w-full relative z-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
                {/* Back Button */}
                <div className="absolute -top-12 left-0">
                    <Link href="/projects" className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.3em] opacity-30 hover:opacity-100 hover:text-primary transition-all">
                        <ArrowLeft className="w-3 h-3" />
                        Abort Initialization
                    </Link>
                </div>

                {/* Card — Modern Glassmorphism */}
                <div className="glass-panel shadow-ruby-massive border border-base-content/20 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl bg-base-100/60 p-10 lg:p-12">
                    <div className="flex flex-col items-center gap-10">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner mb-2">
                                <Folder className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black tracking-tight text-base-content uppercase italic">Initialize Project</h1>
                                <p className="text-sm font-black text-base-content/30 uppercase tracking-[0.2em]">Strategic Framework Creation</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="w-full space-y-12">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Left Side: Project Identity */}
                                <div className="space-y-8 flex flex-col items-center">
                                    <div className="w-full space-y-8">
                                        <div className="space-y-3 text-center">
                                            <label className="text-sm font-black uppercase tracking-[0.3em] text-base-content/30 block">Client / Project Identity</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g., Global Redesign 2024"
                                                className="input input-lg w-full bg-base-content/5 border-none rounded-2xl focus:ring-2 ring-primary/20 transition-all font-black text-center placeholder:text-base-content/40 shadow-inner h-14"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-3 text-center">
                                            <label className="text-sm font-black uppercase tracking-[0.3em] text-base-content/30 block">Strategic Parameters</label>
                                            <textarea
                                                required
                                                placeholder="Codify project scope and mission objectives..."
                                                className="textarea w-full h-40 bg-base-content/5 border-none rounded-[2rem] focus:ring-2 ring-primary/20 transition-all font-bold text-sm p-6 text-center placeholder:text-base-content/40 shadow-inner resize-none overflow-y-auto"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: SLA Defaults */}
                                <div className="space-y-8 flex flex-col items-center">
                                    <div className="w-full h-full p-8 bg-warning/[0.03] rounded-[2.5rem] border border-warning/10 space-y-8 flex flex-col items-center justify-center">
                                        <div className="text-center space-y-2">
                                            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-warning italic leading-none">Response Protocol</h2>
                                            <p className="text-sm font-bold opacity-30 uppercase tracking-widest italic leading-none">Baseline Service Level Agreement</p>
                                        </div>

                                        <div className="w-full space-y-6">
                                            <div className="space-y-2 text-center">
                                                <label className="text-xs font-black uppercase tracking-widest text-base-content/70">Protocol Title</label>
                                                <input
                                                    type="text"
                                                    placeholder="Standard Response"
                                                    className="input input-sm w-full bg-base-100/50 border-none rounded-xl text-center font-black uppercase text-xs focus:ring-1 ring-warning/30"
                                                    value={formData.slaName}
                                                    onChange={(e) => setFormData({ ...formData, slaName: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2 text-center">
                                                    <label className="text-xs font-black uppercase tracking-widest text-base-content/70">Duration (H)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="24"
                                                        className="input input-sm w-full bg-base-100/50 border-none rounded-xl text-center font-black text-xs focus:ring-1 ring-warning/30"
                                                        value={formData.slaDurationHrs}
                                                        onChange={(e) => setFormData({ ...formData, slaDurationHrs: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-2 text-center">
                                                    <label className="text-xs font-black uppercase tracking-widest text-base-content/70">Priority Tier</label>
                                                    <select
                                                        className="select select-sm w-full bg-base-100/50 border-none rounded-xl text-center font-black uppercase text-sm focus:ring-1 ring-warning/30 appearance-none"
                                                        value={formData.slaTier}
                                                        onChange={(e) => setFormData({ ...formData, slaTier: e.target.value })}
                                                    >
                                                        <option value="LOW">Low Velocity</option>
                                                        <option value="STANDARD">Standard</option>
                                                        <option value="URGENT">Critical</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center pt-6">
                                <button
                                    type="submit"
                                    disabled={loading || !formData.title.trim()}
                                    className="btn btn-primary btn-lg w-full max-w-sm h-16 rounded-2xl font-black uppercase text-xs tracking-[0.25em] shadow-ruby-soft hover:scale-[1.03] active:scale-[0.97] transition-all border-none"
                                >
                                    {loading ? (
                                        <span className="loading loading-spinner" />
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Save className="w-5 h-5" />
                                            <span>Deploy Protocol</span>
                                        </div>
                                    )}
                                </button>
                                <p className="mt-4 text-sm font-black uppercase tracking-[0.4em] opacity-20 italic">Framework deployment requires strategic authorization.</p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
