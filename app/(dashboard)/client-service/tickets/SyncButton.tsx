'use client'

import React, { useTransition } from 'react'
import { RefreshCcw, Loader2 } from 'lucide-react'
import { syncGmailAction } from '@/app/actions/gmailActions'
import { useRouter } from 'next/navigation'

export default function SyncButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncGmailAction()
      if (result.success) {
        // We could use a toast library here if available, but for now just refresh
        router.refresh()
      } else {
        // Silently fail or log for auto-sync, maybe alert only for manual sync
        // alert(`Sync failed: ${result.error}`)
        console.error(`Sync failed: ${result.error}`)
      }
    })
  }

  // Auto-sync every 60 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      handleSync()
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <button 
      onClick={handleSync}
      disabled={isPending}
      className={`btn btn-ghost btn-sm gap-2 font-black uppercase text-[10px] tracking-widest ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <RefreshCcw className="w-3 h-3" />
      )}
      {isPending ? 'Syncing...' : 'Sync'}
    </button>
  )
}
