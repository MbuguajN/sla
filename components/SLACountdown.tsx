'use client'

import React, { useState, useEffect } from 'react'
import { differenceInMinutes, differenceInHours, isPast } from 'date-fns'
import { Clock, AlertTriangle, CheckCircle, Flame } from 'lucide-react'
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
        setTimeLeft('Logged')
        return
      }

      const minutesLeft = differenceInMinutes(due, now)
      const hoursLeft = differenceInHours(due, now)

      if (isPast(due)) {
        setStatus('breached')
        setTimeLeft('OVERDUE')
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
    const interval = setInterval(calculateTimeLeft, 60000)

    return () => clearInterval(interval)
  }, [dueDate, isCompleted])

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-base-content/5 rounded-xl border border-transparent">
        <Clock className="w-3.5 h-3.5 opacity-20" />
        <span className="text-[10px] font-black text-base-content/20 uppercase tracking-widest">Async</span>
      </div>
    )
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          style: 'bg-success/10 text-success border-success/20',
          icon: <CheckCircle className="w-3 h-3" />,
          label: 'DONE'
        }
      case 'breached':
        return {
          style: 'bg-error text-white border-error shadow-ruby-soft animate-pulse',
          icon: <AlertTriangle className="w-3 h-3" />,
          label: 'CRITICAL'
        }
      case 'critical':
        return {
          style: 'bg-error/10 text-error border-error/20',
          icon: <Flame className="w-3 h-3 animate-bounce" />,
          label: 'URGENT'
        }
      case 'warning':
        return {
          style: 'bg-warning/10 text-warning border-warning/20',
          icon: <AlertTriangle className="w-3 h-3" />,
          label: 'NEAR'
        }
      default:
        return {
          style: 'bg-primary/5 text-primary border-primary/10',
          icon: <Clock className="w-3 h-3" />,
          label: 'ON TIME'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={cn(
      "flex items-center gap-2 px-2.5 py-1 rounded-xl border transition-all duration-500",
      config.style
    )}>
      {config.icon}
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-black tabular-nums">{timeLeft}</span>
        <span className="text-[7px] font-black uppercase tracking-[0.1em] opacity-60">{config.label}</span>
      </div>
    </div>
  )
}
