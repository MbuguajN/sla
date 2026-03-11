'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { updateUserTheme } from '@/app/actions/profileActions'

export function ThemeSync() {
    const { theme, resolvedTheme } = useTheme()

    useEffect(() => {
        if (resolvedTheme) {
            updateUserTheme(resolvedTheme)
        }
    }, [resolvedTheme])

    return null
}
