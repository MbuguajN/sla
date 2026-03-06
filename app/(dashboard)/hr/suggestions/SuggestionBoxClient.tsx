'use client'

import React, { useState, useMemo } from 'react'
import { updateSuggestionStatus } from '@/app/actions/suggestionActions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { MessageSquare, Eye, CheckCircle2, Search, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Suggestion = {
    id: number
    category: string
    content: string
    status: string
    adminNote: string | null
    createdAt: string
    user: { id: number, name: string | null, email: string, department: { name: string } | null }
}

export default function SuggestionBoxClient({ initialSuggestions }: { initialSuggestions: Suggestion[] }) {
    const [tab, setTab] = useState('OPEN')
    const [search, setSearch] = useState('')
    const [processing, setProcessing] = useState<number | null>(null)
    const [respondingId, setRespondingId] = useState<number | null>(null)
    const [adminNote, setAdminNote] = useState('')
    const router = useRouter()

    const filtered = useMemo(() => {
        let result = initialSuggestions.filter(s => s.status === tab)
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(s =>
                s.content.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q) ||
                s.user.name?.toLowerCase().includes(q)
            )
        }
        return result
    }, [initialSuggestions, tab, search])

    async function handleUpdate(id: number, status: string) {
        setProcessing(id)
        try {
            await updateSuggestionStatus(id, status, adminNote || undefined)
            setRespondingId(null)
            setAdminNote('')
            router.refresh()
        } catch (err) {
            console.error(err)
        } finally {
            setProcessing(null)
        }
    }

    const categoryStyles: Record<string, string> = {
        COMPLAINT: 'bg-error/10 text-error',
        REQUEST: 'bg-info/10 text-info',
        SUGGESTION: 'bg-primary/10 text-primary',
        FEEDBACK: 'bg-success/10 text-success'
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 bg-base-content/5 rounded-xl">
                    {['OPEN', 'REVIEWED', 'RESOLVED'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                tab === t ? "bg-base-100 text-primary shadow-sm" : "text-base-content/30 hover:text-base-content/50"
                            )}
                        >
                            {t} <span className="ml-1 text-[9px] opacity-40">{initialSuggestions.filter(s => s.status === t).length}</span>
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/20" />
                    <input
                        type="text"
                        placeholder="Search feedback..."
                        className="input input-sm input-bordered pl-9 w-full md:w-60 text-[11px] font-bold bg-base-100 rounded-xl"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-base-100 border border-base-content/10 rounded-2xl overflow-hidden shadow-sm">
                <table className="table w-full">
                    <thead>
                        <tr className="bg-base-200/30 text-[10px] font-bold uppercase tracking-widest text-base-content/25 border-b border-base-content/5">
                            <th className="pl-6 h-10 w-48">Sender</th>
                            <th className="w-24">Category</th>
                            <th>Content</th>
                            <th className="pr-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-content/5">
                        {filtered.map(s => (
                            <tr key={s.id} className="hover:bg-base-content/[0.02]">
                                <td className="pl-6 align-top">
                                    <div className="flex flex-col pt-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-base-content/5 flex items-center justify-center">
                                                <User className="w-3 h-3 text-base-content/40" />
                                            </div>
                                            <span className="text-xs font-bold text-base-content">{s.user.name}</span>
                                        </div>
                                        <span className="text-[10px] text-base-content/20 ml-8">{s.user.department?.name || 'No Dept'}</span>
                                        <span className="text-[9px] text-base-content/15 ml-8 mt-1 italic">{format(new Date(s.createdAt), 'MMM d, HH:mm')}</span>
                                    </div>
                                </td>
                                <td className="align-top font-bold">
                                    <span className={cn("inline-block px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider mt-1.5", categoryStyles[s.category] || 'bg-base-200 text-base-content/40')}>
                                        {s.category}
                                    </span>
                                </td>
                                <td className="align-top py-4">
                                    <div className="space-y-3">
                                        <p className="text-sm text-base-content/70 leading-relaxed font-medium">{s.content}</p>
                                        {s.adminNote && (
                                            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-[11px] text-primary font-bold flex gap-2">
                                                <div className="shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /></div>
                                                <span>Note: {s.adminNote}</span>
                                            </div>
                                        )}
                                        {s.status === 'OPEN' && respondingId === s.id && (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                                <input
                                                    type="text"
                                                    placeholder="Add internal note..."
                                                    className="input input-xs input-bordered flex-1 text-[11px]"
                                                    value={adminNote}
                                                    onChange={e => setAdminNote(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => handleUpdate(s.id, 'REVIEWED')}
                                                    disabled={processing === s.id}
                                                    className="btn btn-xs btn-info text-white font-bold px-3 py-0"
                                                >
                                                    Mark Reviewed
                                                </button>
                                                <button
                                                    onClick={() => handleUpdate(s.id, 'RESOLVED')}
                                                    disabled={processing === s.id}
                                                    className="btn btn-xs btn-success text-white font-bold px-3 py-0"
                                                >
                                                    Resolve
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="pr-6 align-top text-right pt-4">
                                    {s.status === 'OPEN' && respondingId !== s.id && (
                                        <button
                                            onClick={() => setRespondingId(s.id)}
                                            className="btn btn-ghost btn-xs text-primary font-bold uppercase tracking-wider text-[10px]"
                                        >
                                            Process
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filtered.length === 0 && (
                    <div className="text-center py-20 bg-base-100">
                        <MessageSquare className="w-8 h-8 text-base-content/10 mx-auto mb-3" />
                        <p className="text-[11px] text-base-content/15 italic font-medium">No {tab.toLowerCase()} suggestions found</p>
                    </div>
                )}
            </div>
        </div>
    )
}
