'use client'

import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'

export default function InactivityLogout({ timeoutMs = 30 * 60 * 1000 }: { timeoutMs?: number }) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: '/login' })
    }, timeoutMs)
  }

  useEffect(() => {
    // Events to track activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    // Initial timer
    resetTimer()

    const handleActivity = () => resetTimer()

    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [timeoutMs])

  return null
}
