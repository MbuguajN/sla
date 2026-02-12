
'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      defaultTheme="system" 
      themes={['light', 'dark']}
      attribute="data-theme"
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
