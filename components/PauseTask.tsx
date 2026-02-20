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
        Pause Directive
      </button>

      {isPaused && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-base-300/60 backdrop-blur-sm" onClick={() => setIsPaused(false)} />
          <div className="relative w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-warning/20 p-6 animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-warning">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold uppercase tracking-tight">Pause Operational Flow</h3>
            </div>

            <p className="text-sm text-base-content/60 mb-4 font-medium">
              Specify the exact reason for the pause. The initial reporter will be notified immediately of this bottleneck.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Awaiting client assets, Missing technical specifications..."
              className="textarea textarea-bordered w-full h-32 focus:textarea-warning mb-6 font-medium"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setIsPaused(false)}
                className="btn btn-ghost flex-1 uppercase font-bold"
              >
                Abort
              </button>
              <button
                onClick={handlePause}
                disabled={!reason.trim() || loading}
                className="btn btn-warning flex-1 gap-2 uppercase font-bold"
              >
                {loading ? <span className="loading loading-spinner loading-xs" /> : <Send className="w-4 h-4" />}
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
