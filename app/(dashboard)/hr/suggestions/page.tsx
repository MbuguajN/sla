import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSuggestions } from '@/app/actions/suggestionActions'
import SuggestionBoxClient from './SuggestionBoxClient'
import { MessageSquare, Inbox, Eye, CheckCircle2 } from 'lucide-react'

export default async function SuggestionBoxPage() {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'ADMIN' && role !== 'HR') redirect('/')

    const suggestions = await getSuggestions()

    const open = suggestions.filter((s: any) => s.status === 'OPEN').length
    const reviewed = suggestions.filter((s: any) => s.status === 'REVIEWED').length
    const resolved = suggestions.filter((s: any) => s.status === 'RESOLVED').length

    return (
        <div className="space-y-6 pb-20">
            {/* Clean Header */}
            <div className="flex items-end justify-between border-b border-base-content/5 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-info font-bold uppercase tracking-wider text-xs opacity-70">
                        <MessageSquare className="w-3 h-3" />
                        Feedback & Suggestions
                    </div>
                    <h1 className="text-4xl font-bold text-base-content tracking-tight leading-none">Suggestion Box</h1>
                </div>
                <div className="flex items-center gap-4">
                    {[
                        { label: 'Open', val: open, color: 'text-warning' },
                        { label: 'Reviewed', val: reviewed, color: 'text-info' },
                        { label: 'Resolved', val: resolved, color: 'text-success' },
                    ].map((s, i) => (
                        <div key={i} className="text-right">
                            <span className={`text-lg font-bold ${s.color}`}>{s.val}</span>
                            <span className="text-[9px] uppercase tracking-wider text-base-content/20 font-bold block">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <SuggestionBoxClient initialSuggestions={JSON.parse(JSON.stringify(suggestions))} />
        </div>
    )
}
