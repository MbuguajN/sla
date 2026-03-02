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
                <div className="flex items-center gap-1 p-1.5 bg-base-content/5 rounded-2xl">
                    {['OPEN', 'REVIEWED', 'RESOLVED'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                                tab === t ? "bg-white dark:bg-primary/10 text-primary shadow-sm" : "text-base-content/30 hover:text-base-content/50"
                            )}
                        >
                            {t} <span className="ml-1 text-[10px] opacity-50">{initialSuggestions.filter(s => s.status === t).length}</span>
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="input input-sm input-bordered pl-9 w-full md:w-60 text-sm bg-base-100"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                {filtered.map(s => (
                    <div key={s.id} className="glass-panel rounded-2xl p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <span className={cn("badge badge-sm font-bold text-[10px] uppercase tracking-wider border-none whitespace-nowrap", categoryStyles[s.category] || 'bg-base-200 text-base-content/40')}>
                                    {s.category}
                                </span>
                                <span className="text-xs text-base-content/30">{format(new Date(s.createdAt), 'MMM d, yyyy • HH:mm')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-base-content/30">
                                <User className="w-3 h-3" />
                                <span className="font-bold">{s.user.name}</span>
                                <span className="text-base-content/20">• {s.user.department?.name || 'N/A'}</span>
                            </div>
                        </div>

                        <p className="text-sm text-base-content/70 leading-relaxed">{s.content}</p>

                        {s.adminNote && (
                            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-xs text-primary font-medium">
                                Admin Response: {s.adminNote}
                            </div>
                        )}

                        {s.status === 'OPEN' && (
                            <div className="flex items-center gap-2 pt-2">
                                {respondingId === s.id ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <input
                                            type="text"
                                            placeholder="Admin note (optional)..."
                                            className="input input-sm input-bordered flex-1"
                                            value={adminNote}
                                            onChange={e => setAdminNote(e.target.value)}
                                        />
                                        <button
                                            onClick={() => handleUpdate(s.id, 'REVIEWED')}
                                            disabled={processing === s.id}
                                            className="btn btn-xs btn-info gap-1 text-white"
                                        >
                                            <Eye className="w-3 h-3" /> Reviewed
                                        </button>
                                        <button
                                            onClick={() => handleUpdate(s.id, 'RESOLVED')}
                                            disabled={processing === s.id}
                                            className="btn btn-xs btn-success gap-1 text-white"
                                        >
                                            <CheckCircle2 className="w-3 h-3" /> Resolve
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setRespondingId(s.id)}
                                        className="btn btn-xs btn-ghost text-primary hover:bg-primary/10 font-bold"
                                    >
                                        Respond
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="text-center py-16 text-sm text-base-content/30 italic">No {tab.toLowerCase()} suggestions</div>
                )}
            </div>
        </div>
    )
}
