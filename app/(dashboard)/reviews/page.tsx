'use client'

import React, { useState, useEffect } from 'react'
import { getReviewAssignments, submitReview } from '@/app/actions/reviewActions'
import { Star, ChevronRight, CheckCircle2, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReviewFlowPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [currentPersonIndex, setCurrentPersonIndex] = useState(0)
    const [ratings, setRatings] = useState<Record<number, number>>({})
    const [submitting, setSubmitting] = useState(false)
    const [allDone, setAllDone] = useState(false)

    useEffect(() => {
        loadAssignments()
    }, [])

    const loadAssignments = async () => {
        setLoading(true)
        const result = await getReviewAssignments()
        setData(result)

        // Filter out already completed
        if (result.reviewees && result.completedIds) {
            const remaining = result.reviewees.filter((r: any) => !(result.completedIds as number[]).includes(r.id))
            if (remaining.length === 0 && result.reviewees.length > 0) {
                setAllDone(true)
            }
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        )
    }

    if (!data?.cycle) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-base-content/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Star className="w-8 h-8 text-base-content/20" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-base-content">No Active Review</h1>
                <p className="text-sm text-base-content/40 mt-2">There is no active performance review cycle at this time.</p>
            </div>
        )
    }

    const remainingReviewees = data.reviewees.filter((r: any) => !(data.completedIds as number[]).includes(r.id))

    if (allDone || remainingReviewees.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-base-content">All Done!</h1>
                <p className="text-sm text-base-content/40 mt-2">You have completed all your reviews for "{data.cycle.title}". Thank you!</p>
            </div>
        )
    }

    const currentPerson = remainingReviewees[currentPersonIndex] || remainingReviewees[0]
    const questions = data.questions

    const setRating = (questionId: number, value: number) => {
        setRatings(prev => ({ ...prev, [questionId]: value }))
    }

    const handleSubmitPerson = async () => {
        // Check all questions are rated
        const allRated = questions.every((q: any) => ratings[q.id] && ratings[q.id] > 0)
        if (!allRated) {
            alert('Please rate all questions before submitting.')
            return
        }

        setSubmitting(true)
        try {
            await submitReview(
                data.cycle.id,
                currentPerson.id,
                questions.map((q: any) => ({ questionId: q.id, rating: ratings[q.id] }))
            )

            // Reset and move to next person
            setRatings({})
            if (currentPersonIndex < remainingReviewees.length - 1) {
                setCurrentPersonIndex(prev => prev + 1)
            } else {
                setAllDone(true)
            }
        } catch (e: any) {
            alert(e.message || 'Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-base-content">Performance Review</h1>
                    <p className="text-[11px] font-bold text-base-content/30 uppercase tracking-[0.2em] mt-1">{data.cycle.title}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-base-content/30 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    {remainingReviewees.length - currentPersonIndex} remaining
                </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
                {remainingReviewees.map((_: any, i: number) => (
                    <div key={i} className={cn(
                        "h-1.5 flex-1 rounded-full transition-all duration-500",
                        i < currentPersonIndex ? "bg-success" :
                            i === currentPersonIndex ? "bg-primary" : "bg-base-content/10"
                    )} />
                ))}
            </div>

            {/* Current Person Card */}
            <div className="glass-panel rounded-3xl p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
                    {currentPerson.avatarUrl ? (
                        <img src={currentPerson.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                        currentPerson.name?.charAt(0) || <User className="w-6 h-6" />
                    )}
                </div>
                <div>
                    <h2 className="text-lg font-black tracking-tight text-base-content">{currentPerson.name}</h2>
                    <p className="text-[10px] text-base-content/30 uppercase tracking-wider">{currentPerson.role}</p>
                </div>
            </div>

            {/* Questions as Cards */}
            <div className="space-y-4">
                {questions.map((q: any, qi: number) => (
                    <div key={q.id} className="glass-panel rounded-3xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${qi * 80}ms` }}>
                        <p className="text-sm font-bold text-base-content">{q.text}</p>

                        {/* Rating 1-10 */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                                <button
                                    key={n}
                                    onClick={() => setRating(q.id, n)}
                                    className={cn(
                                        "w-9 h-9 rounded-xl text-xs font-black transition-all duration-200",
                                        ratings[q.id] === n
                                            ? "bg-primary text-primary-content scale-110 shadow-lg shadow-primary/30"
                                            : ratings[q.id] && n <= ratings[q.id]
                                                ? "bg-primary/20 text-primary"
                                                : "bg-base-content/5 text-base-content/40 hover:bg-base-content/10"
                                    )}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between text-[9px] uppercase tracking-widest text-base-content/20 font-bold">
                            <span>Poor</span>
                            <span>Excellent</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Submit */}
            <div className="flex justify-end">
                <button
                    onClick={handleSubmitPerson}
                    disabled={submitting}
                    className="btn btn-primary btn-sm font-black uppercase tracking-widest text-[10px] gap-1"
                >
                    {submitting ? (
                        <span className="loading loading-spinner loading-xs" />
                    ) : currentPersonIndex < remainingReviewees.length - 1 ? (
                        <>Next Person <ChevronRight className="w-3.5 h-3.5" /></>
                    ) : (
                        <>Finish Review <CheckCircle2 className="w-3.5 h-3.5" /></>
                    )}
                </button>
            </div>
        </div>
    )
}
