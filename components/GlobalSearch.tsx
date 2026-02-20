'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, Command, X, FileText, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query) return

    // If it's a number, assume it's a Task ID
    const taskId = parseInt(query)
    if (!isNaN(taskId)) {
      router.push(`/tasks/${taskId}`)
      setIsOpen(false)
      setQuery('')
    } else {
      // Otherwise, redirect to the tasks index with a search param
      router.push(`/tasks?search=${encodeURIComponent(query)}`)
      setIsOpen(false)
      setQuery('')
    }
  }

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 bg-base-200 hover:bg-base-300 rounded-xl border border-base-300 transition-all text-base-content/50 hover:text-base-content min-w-[240px] group"
      >
        <Search className="w-4 h-4" />
        <span className="text-sm font-medium flex-1 text-left">Internal Search...</span>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-base-100 rounded border border-base-400/20 shadow-sm">
          <Command className="w-2.5 h-2.5" />
          <span className="text-xs font-medium">K</span>
        </div>
      </button>

      {/* Command Palette Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <div
            className="absolute inset-0 bg-base-300/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-xl bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleSearch} className="flex items-center p-4 gap-4 border-b border-base-200">
              <Search className="w-5 h-5 text-primary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Task ID (e.g. 101) or Directive Title..."
                className="flex-1 bg-transparent border-none outline-none text-base font-medium placeholder:text-base-content/30"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="w-4 h-4" />
              </button>
            </form>

            <div className="p-4 bg-base-200/20">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold tracking-wide text-base-content/40 px-2">Quick Navigation</span>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() => { router.push('/'); setIsOpen(false); }}
                    className="flex items-center gap-3 p-3 hover:bg-base-200 rounded-xl transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                      <FileText className="w-4 h-4 text-primary group-hover:text-primary-content" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-bold">Operational Timeline</span>
                      <span className="text-xs text-base-content/40 font-normal">View all active directives</span>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-2 border-t border-base-200 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 opacity-40">
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-base-300 rounded">ESC</span>
                <span className="text-[10px] font-bold">to close</span>
              </div>
              <div className="flex items-center gap-1 opacity-40">
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-base-300 rounded">ENTER</span>
                <span className="text-[10px] font-bold">to search</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
