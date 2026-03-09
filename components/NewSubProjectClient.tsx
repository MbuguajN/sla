'use client'

import React, { useState } from 'react'
import { Plus, FolderPlus, X, GitBranch } from 'lucide-react'
import { createSubProject, createSublet } from '@/app/actions/subProjectActions'

interface NewSubProjectClientProps {
    projectId: number
    parentId?: number  // if set, we're creating a sublet
    onCreated?: () => void
}

export default function NewSubProjectClient({ projectId, parentId, onCreated }: NewSubProjectClientProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')

    const isSublet = !!parentId
    const label = isSublet ? 'Unit' : 'Phase'

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim()) return
        setLoading(true)

        try {
            if (isSublet && parentId) {
                await createSublet({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    parentId,
                    projectId,
                })
            } else {
                await createSubProject({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    projectId,
                })
            }
            setTitle('')
            setDescription('')
            setIsOpen(false)
            onCreated?.()
        } catch (err: any) {
            alert(err.message || `Failed to create ${label.toLowerCase()}`)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="btn btn-primary btn-md px-6 rounded-2xl gap-2 shadow-lg shadow-primary/20 uppercase font-black tracking-widest text-sm"
            >
                {isSublet ? <GitBranch className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                New {label}
            </button>
        )
    }

    return (
        <div className="card bg-base-100 border border-primary/20 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                        {isSublet ? <GitBranch size={16} /> : <FolderPlus size={16} />}
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-primary">
                            New {label}
                        </h3>
                        <p className="text-sm font-bold text-base-content/70 mt-0.5">
                            {isSublet ? 'Add a unit to this phase' : 'Add a phase to this project'}
                        </p>
                    </div>
                </div>
                <button onClick={() => { setIsOpen(false); setTitle(''); setDescription('') }} className="btn btn-ghost btn-xs btn-circle">
                    <X size={14} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-black text-sm uppercase tracking-wider opacity-60">{label} Name</span>
                    </label>
                    <input
                        type="text"
                        required
                        autoFocus
                        placeholder={isSublet ? 'e.g., Phase 1 Deliverables' : 'e.g., Website Redesign'}
                        className="input input-bordered w-full font-bold text-sm bg-base-200/30 border-base-300 focus:border-primary"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-black text-sm uppercase tracking-wider opacity-60">Description (Optional)</span>
                    </label>
                    <textarea
                        placeholder="Brief scope description..."
                        className="textarea textarea-bordered h-20 w-full font-medium text-sm bg-base-200/30 border-base-300 focus:border-primary"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading || !title.trim()}
                        className="btn btn-primary btn-sm px-6 gap-2 uppercase font-black tracking-widest text-sm"
                    >
                        {loading ? (
                            <span className="loading loading-spinner loading-xs" />
                        ) : (
                            <Plus className="w-3.5 h-3.5" />
                        )}
                        Create {label}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsOpen(false); setTitle(''); setDescription('') }}
                        className="btn btn-ghost btn-sm uppercase font-black tracking-widest text-sm opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}
