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
        <div className="space-y-8 pb-20 animate-fade-in-up">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden glass-panel rounded-3xl p-8 md:p-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-info/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 blur-[60px] rounded-full -ml-24 -mb-24" />
                <div className="relative flex items-center gap-6">
                    <div className="w-16 h-16 bg-info text-white rounded-3xl flex items-center justify-center shadow-lg shrink-0">
                        <MessageSquare className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-base-content mb-0">Suggestion Box</h1>
                        <p className="text-[11px] font-bold text-base-content/30 uppercase tracking-[0.2em] mt-1">Anonymous Employee Submissions</p>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                    {[
                        { label: 'Open', val: open, col: 'text-warning', ring: 'ring-warning/10', icon: Inbox },
                        { label: 'Reviewed', val: reviewed, col: 'text-info', ring: 'ring-info/10', icon: Eye },
                        { label: 'Resolved', val: resolved, col: 'text-success', ring: 'ring-success/10', icon: CheckCircle2 },
                    ].map((s, i) => (
                        <div key={i} className={`bg-base-100/50 backdrop-blur-sm rounded-2xl p-5 ring-1 transition-all hover:scale-[1.03] ${s.ring}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <s.icon className={`w-3.5 h-3.5 ${s.col} opacity-60`} />
                                <span className="text-[9px] uppercase font-black tracking-[0.3em] text-base-content/20">{s.label}</span>
                            </div>
                            <span className={`text-3xl font-black tracking-tighter ${s.col}`}>{s.val}</span>
                        </div>
                    ))}
                </div>
            </div>

            <SuggestionBoxClient initialSuggestions={JSON.parse(JSON.stringify(suggestions))} />
        </div>
    )
}
