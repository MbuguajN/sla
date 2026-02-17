'use client'

import { useEffect } from 'react'
import { pingPresence } from '@/app/actions/presenceActions'

const HEARTBEAT_INTERVAL = 60 * 1000 // 60 seconds

export default function PresenceHeartbeat() {
    useEffect(() => {
        // Initial ping
        pingPresence()

        const interval = setInterval(() => {
            pingPresence()
        }, HEARTBEAT_INTERVAL)

        return () => clearInterval(interval)
    }, [])

    return null
}
