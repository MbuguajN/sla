'use client'

import React, { useState } from 'react'
import { pauseTask } from '@/app/actions/taskActions'
import { Pause, AlertCircle, Send } from 'lucide-react'

export default function PauseTask({ taskId, onComplete }: { taskId: number, onComplete?: () => void }) {
  const [isPaused, setIsPaused] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePause = async () => {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await pauseTask(taskId, reason)
      setIsPaused(false)
      setReason('')
      if (onComplete) onComplete()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setIsPaused(true)}
        className="btn btn-warning btn-sm"
      >
        Pause Task
      </button>

      {isPaused && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsPaused(false)}
          />
          <div className="relative w-full max-w-md bg-base-100 rounded-[2.5rem] shadow-ruby-massive border border-base-content/5 p-10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col items-center text-center">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-warning/5 rounded-full -ml-16 -mb-16 blur-2xl opacity-50" />

            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="w-14 h-14 bg-warning/10 text-warning rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-warning/20">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div className="space-y-2 mb-8">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-base-content leading-none italic">Pause Instance</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-warning/60 leading-none">Operational Justification Required</p>
              </div>

              <div className="w-full space-y-8">
                <div className="relative group">
                  <textarea
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide context for this operational halt..."
                    className="textarea w-full h-32 bg-base-content/5 border-none focus:ring-2 ring-warning/20 transition-all font-bold text-sm p-6 rounded-[2rem] resize-none text-center placeholder:text-base-content/10 shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={handlePause}
                    disabled={!reason.trim() || loading}
                    className="btn btn-warning w-full h-14 rounded-2xl gap-3 text-xs font-black uppercase tracking-[0.25em] shadow-ruby-soft transition-all hover:scale-[1.02] active:scale-[0.98] border-none"
                  >
                    {loading ? <span className="loading loading-spinner" /> : (
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        <span>Authorize Pause</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setIsPaused(false)}
                    className="btn btn-ghost w-full h-12 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30 hover:text-base-content transition-all hover:bg-transparent"
                  >
                    Abort & Resume
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
