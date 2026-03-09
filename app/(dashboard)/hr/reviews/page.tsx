'use client'

import React, { useState, useEffect } from 'react'
import { createReviewCycle, getAllReviewCycles, closeReviewCycle, getReviewResults } from '@/app/actions/reviewActions'
import { Plus, X, CheckCircle2, AlertCircle, Clock, XCircle, Star, ChevronDown, ChevronUp, Sparkles, Users, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function HRReviewsPage() {
    const [cycles, setCycles] = useState<any[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [title, setTitle] = useState('')
    const [expiresAt, setExpiresAt] = useState('')
    const [managerQuestions, setManagerQuestions] = useState<string[]>([''])
    const [employeeQuestions, setEmployeeQuestions] = useState<string[]>([''])
    const [creating, setCreating] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [expandedResults, setExpandedResults] = useState<number | null>(null)
    const [results, setResults] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => { loadCycles() }, [])

    const loadCycles = async () => {
        const data = await getAllReviewCycles()
        setCycles(data)
    }

    const handleCreate = async () => {
        if (!title || !expiresAt) return
        const filteredMgr = managerQuestions.filter(q => q.trim())
        const filteredEmp = employeeQuestions.filter(q => q.trim())
        if (filteredMgr.length === 0 && filteredEmp.length === 0) {
            setMessage({ type: 'error', text: 'Add at least one question' })
            return
        }
        setCreating(true)
        setMessage(null)
        try {
            await createReviewCycle({ title, expiresAt, managerQuestions: filteredMgr, employeeQuestions: filteredEmp })
            setMessage({ type: 'success', text: 'Review cycle launched successfully' })
            setShowCreate(false)
            setTitle(''); setExpiresAt(''); setManagerQuestions(['']); setEmployeeQuestions([''])
            loadCycles()
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Failed to create' })
        } finally { setCreating(false) }
    }

    const handleClose = async (id: number) => {
        if (!confirm('Close this review cycle? This cannot be undone.')) return
        await closeReviewCycle(id)
        loadCycles()
    }

    const handleViewResults = async (cycleId: number) => {
        if (expandedResults === cycleId) { setExpandedResults(null); setResults(null); return }
        const data = await getReviewResults(cycleId)
        setResults(data)
        setExpandedResults(cycleId)
    }

    const addQuestion = (type: 'manager' | 'employee') => {
        if (type === 'manager') setManagerQuestions(prev => [...prev, ''])
        else setEmployeeQuestions(prev => [...prev, ''])
    }
    const removeQuestion = (type: 'manager' | 'employee', index: number) => {
        if (type === 'manager') setManagerQuestions(prev => prev.filter((_, i) => i !== index))
        else setEmployeeQuestions(prev => prev.filter((_, i) => i !== index))
    }
    const updateQuestion = (type: 'manager' | 'employee', index: number, value: string) => {
        if (type === 'manager') setManagerQuestions(prev => prev.map((q, i) => i === index ? value : q))
        else setEmployeeQuestions(prev => prev.map((q, i) => i === index ? value : q))
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-end justify-between border-b border-base-content/20 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-success font-bold uppercase tracking-wider text-xs opacity-70">
                        <Star className="w-3 h-3" />
                        Performance Management
                    </div>
                    <h1 className="text-4xl font-bold text-base-content tracking-tight leading-none">Reviews</h1>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className={cn(
                    "btn btn-sm gap-1.5 font-bold uppercase tracking-wider text-sm",
                    showCreate ? "btn-ghost" : "btn-primary"
                )}>
                    {showCreate ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><Sparkles className="w-3.5 h-3.5" /> Launch Review</>}
                </button>
            </div>

            {message && (
                <div className={cn("flex items-center gap-2 text-sm font-bold uppercase tracking-widest py-2.5 px-4 rounded-xl border", message.type === 'success' ? 'bg-success/5 text-success border-success/20' : 'bg-error/5 text-error border-error/20')}>
                    {message.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {message.text}
                </div>
            )}

            {/* Create Form — polished, structured, enterprise */}
            {showCreate && (
                <div className="bg-base-100 border border-base-content/10 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-1 duration-300">
                    {/* Form Header */}
                    <div className="px-6 py-4 border-b border-base-content/20 bg-base-200/30">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-base-content/70 flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            New Review Cycle
                        </h2>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-sm font-bold uppercase tracking-widest text-base-content/25 block mb-1.5">Review Title</label>
                                <input type="text" className="input input-bordered input-sm w-full" placeholder="Q1 2026 Performance Review" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm font-bold uppercase tracking-widest text-base-content/25 block mb-1.5">Deadline</label>
                                <input type="datetime-local" className="input input-bordered input-sm w-full" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                            </div>
                        </div>

                        {/* Questions Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Manager → Employee Questions */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-bold text-base-content flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-primary" />
                                            Manager → Employee
                                        </h3>
                                        <p className="text-xs text-base-content/70 mt-0.5">Questions managers use to rate their team members</p>
                                    </div>
                                    <button onClick={() => addQuestion('manager')} className="btn btn-ghost btn-xs text-primary gap-0.5 text-sm">
                                        <Plus className="w-3 h-3" /> Add
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {managerQuestions.map((q, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-base-content/15 w-5 shrink-0 text-center">{i + 1}.</span>
                                            <input type="text" className="input input-bordered input-sm flex-1 text-xs" placeholder="Enter question..." value={q} onChange={e => updateQuestion('manager', i, e.target.value)} />
                                            {managerQuestions.length > 1 && (
                                                <button onClick={() => removeQuestion('manager', i)} className="btn btn-ghost btn-xs text-base-content/70 hover:text-error"><X className="w-3 h-3" /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Employee → Manager Questions */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-bold text-base-content flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-warning" />
                                            Employee → Manager
                                        </h3>
                                        <p className="text-xs text-base-content/70 mt-0.5">Questions employees use to rate their manager</p>
                                    </div>
                                    <button onClick={() => addQuestion('employee')} className="btn btn-ghost btn-xs text-primary gap-0.5 text-sm">
                                        <Plus className="w-3 h-3" /> Add
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {employeeQuestions.map((q, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-base-content/15 w-5 shrink-0 text-center">{i + 1}.</span>
                                            <input type="text" className="input input-bordered input-sm flex-1 text-xs" placeholder="Enter question..." value={q} onChange={e => updateQuestion('employee', i, e.target.value)} />
                                            {employeeQuestions.length > 1 && (
                                                <button onClick={() => removeQuestion('employee', i)} className="btn btn-ghost btn-xs text-base-content/70 hover:text-error"><X className="w-3 h-3" /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Footer */}
                    <div className="px-6 py-4 border-t border-base-content/20 bg-base-200/20 flex items-center justify-between">
                        <p className="text-xs text-base-content/70">This will close any existing active cycle and notify all employees.</p>
                        <button onClick={handleCreate} disabled={creating || !title || !expiresAt} className="btn btn-primary btn-sm font-bold uppercase tracking-wider text-sm gap-1.5">
                            {creating ? <span className="loading loading-spinner loading-xs" /> : <><Sparkles className="w-3.5 h-3.5" /> Launch Cycle</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Existing Cycles */}
            <div className="space-y-3">
                {cycles.map((cycle: any) => (
                    <div key={cycle.id} className="bg-base-100 border border-base-content/10 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-2 h-8 rounded-full shrink-0", cycle.status === 'ACTIVE' ? 'bg-success' : 'bg-base-content/10')} />
                                <div>
                                    <h3 className="text-sm font-bold text-base-content">{cycle.title}</h3>
                                    <p className="text-sm text-base-content/25 flex items-center gap-1.5 mt-0.5">
                                        <Clock className="w-3 h-3" />
                                        {cycle.status === 'ACTIVE' ? 'Expires' : 'Closed'} {format(new Date(cycle.expiresAt), 'MMM d, yyyy HH:mm')}
                                        <span className="text-base-content/40">•</span>
                                        {cycle._count.responses} responses
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {expandedResults === cycle.id && (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/70" />
                                        <input
                                            type="text"
                                            placeholder="Find employee..."
                                            className="input input-xs input-bordered pl-8 w-40 text-sm font-bold"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleViewResults(cycle.id)} className="btn btn-ghost btn-xs font-bold text-sm uppercase tracking-wider gap-1">
                                        Results {expandedResults === cycle.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                    {cycle.status === 'ACTIVE' && (
                                        <button onClick={() => handleClose(cycle.id)} className="btn btn-ghost btn-xs text-error font-bold text-sm uppercase tracking-wider gap-1">
                                            <XCircle className="w-3 h-3" /> Close
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        {expandedResults === cycle.id && results && (
                            <div className="border-t border-base-content/20 animate-in fade-in duration-200">
                                {results.length === 0 ? (
                                    <p className="text-center text-sm text-base-content/15 py-10 italic">No responses yet</p>
                                ) : (
                                    <table className="table w-full">
                                        <thead>
                                            <tr className="bg-base-200/30 text-sm font-bold uppercase tracking-widest text-base-content/25 border-b border-base-content/20">
                                                <th className="pl-6 h-10">Employee</th>
                                                <th>Department</th>
                                                <th>Feedback Details (Reviewers)</th>
                                                <th>Total Score</th>
                                                <th className="text-right pr-6">Average</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-base-content/5">
                                            {results
                                                .filter((r: any) => r.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                                                .map((r: any) => (
                                                    <tr key={r.id} className="hover:bg-base-content/[0.02]">
                                                        <td className="pl-6">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                                                                    {r.name?.charAt(0) || '?'}
                                                                </div>
                                                                <span className="text-xs font-bold text-base-content">{r.name}</span>
                                                            </div>
                                                        </td>
                                                        <td><span className="text-sm text-base-content/30">{r.department?.name || r.role}</span></td>
                                                        <td className="max-w-[300px]">
                                                            <div className="flex flex-col gap-1 py-2">
                                                                {r.questionBreakdown.map((q: any) => (
                                                                    <div key={q.questionId} className="group/q">
                                                                        <p className="text-xs font-bold text-base-content/70 leading-tight">{q.questionText}</p>
                                                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                                                            {q.ratings.map((rt: any, idx: number) => (
                                                                                <div key={idx} className="badge badge-xs bg-base-200 border-none text-sm flex gap-1 items-center px-1.5 py-2 group/tip relative">
                                                                                    <span className="font-bold text-primary">{rt.value}</span>
                                                                                    <span className="opacity-40">{rt.reviewer}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="text-xs font-black text-primary">{r.totalScore}</span>
                                                        </td>
                                                        <td className="text-right pr-6">
                                                            <div className="flex items-center gap-1 justify-end">
                                                                <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                                                                <span className="text-sm font-bold text-base-content">{r.avgRating}</span>
                                                                <span className="text-xs text-base-content/15">/10</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {cycles.length === 0 && (
                    <div className="text-center py-16">
                        <Star className="w-8 h-8 text-base-content/40 mx-auto mb-3" />
                        <p className="text-sm text-base-content/15 italic font-medium">No review cycles created yet</p>
                    </div>
                )}
            </div>
        </div>
    )
}
