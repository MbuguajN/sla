'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function useRealtimeRefresh(intervalMs: number = 10000) {
  const router = useRouter()
  const lastVersionRef = useRef<number | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/poll', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()

      if (lastVersionRef.current !== null && data.version !== lastVersionRef.current) {
        router.refresh()
      }
      lastVersionRef.current = data.version
    } catch {
      // Silently fail - next poll will retry
    }
  }, [router])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, intervalMs)
    return () => clearInterval(interval)
  }, [poll, intervalMs])
}
