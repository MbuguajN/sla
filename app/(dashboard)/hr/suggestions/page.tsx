import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSuggestions } from '@/app/actions/suggestionActions'
import SuggestionBoxClient from './SuggestionBoxClient'

export default async function SuggestionBoxPage() {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'ADMIN') redirect('/')

    const suggestions = await getSuggestions()

    return (
        <div className="space-y-8 pb-20 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold text-base-content tracking-tight">Suggestion Box</h1>
                <p className="text-sm text-base-content/40 mt-1">Anonymous employee submissions — visible only to you</p>
            </div>
            <SuggestionBoxClient initialSuggestions={JSON.parse(JSON.stringify(suggestions))} />
        </div>
    )
}
