'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from './ThemeProvider'
import { ThemeSync } from './ThemeSync'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <ThemeSync />
                {children}
            </ThemeProvider>
        </SessionProvider>
    )
}
