'use client'

import React, { useState, useEffect } from 'react'
import { differenceInMinutes, differenceInHours, isPast } from 'date-fns'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SLACountdown({
  dueDate,
  isCompleted = false
}: {
  dueDate: Date,
  isCompleted?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [status, setStatus] = useState<'safe' | 'warning' | 'critical' | 'breached' | 'completed'>('safe')

  useEffect(() => {
    setMounted(true)

    const calculateTimeLeft = () => {
      const now = new Date()
      const due = new Date(dueDate)

      if (isCompleted) {
        setStatus('completed')
        setTimeLeft('Complete')
        return
      }

      const minutesLeft = differenceInMinutes(due, now)
      const hoursLeft = differenceInHours(due, now)

      if (isPast(due)) {
        setStatus('breached')
        setTimeLeft('BREACHED')
        return
      }

      if (hoursLeft < 2) {
        setStatus('critical')
      } else if (hoursLeft < 6) {
        setStatus('warning')
      } else {
        setStatus('safe')
      }

      if (hoursLeft < 1) {
        setTimeLeft(`${minutesLeft}m`)
      } else {
        setTimeLeft(`${hoursLeft}h`)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [dueDate, isCompleted])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-base-300 rounded-lg">
        <Clock className="w-4 h-4 opacity-50" />
        <span className="text-sm font-bold">--</span>
      </div>
    )
  }

  const getStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success border-success/30'
      case 'breached':
        return 'bg-error/20 text-error border-error/30 animate-pulse'
      case 'critical':
        return 'bg-error/20 text-error border-error/30'
      case 'warning':
        return 'bg-warning/20 text-warning border-warning/30'
      default:
        return 'bg-primary/20 text-primary border-primary/30'
    }
  }

  const getIcon = () => {
    if (status === 'completed') return <CheckCircle className="w-2.5 h-2.5" />
    if (status === 'breached' || status === 'critical') return <AlertTriangle className="w-2.5 h-2.5" />
    return <Clock className="w-2.5 h-2.5" />
  }

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${getStyles()} transition-all`}>
      {getIcon()}
      <span className="text-[9px] font-bold tabular-nums leading-none">{timeLeft}</span>
    </div>
  )
}
