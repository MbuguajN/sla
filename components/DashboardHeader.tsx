'use client'

import React from 'react'
import { Users as UsersIcon } from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import AnimatedTooltipMotion from './ui/animated-tooltip'

export default function DashboardHeader({ activeUsers = [] }: { activeUsers?: any[] }) {
  const displayUsers = activeUsers

  return (
    <div className="sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 px-8 glass-panel rounded-3xl mb-8 shadow-soft overflow-visible">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
          <UsersIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-base-content tracking-tight mb-0">Dashboard</h1>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {displayUsers.length > 0 && (
          <div className="hidden lg:flex items-center gap-3 bg-base-content/5 px-4 py-2 rounded-2xl border border-base-content/20 whitespace-nowrap">
            <AnimatedTooltipMotion items={displayUsers.map(u => ({ ...u, name: u.name || 'User' }))} />
            <div className="flex flex-col justify-center">
              <span className="text-[12px] font-bold leading-none">{displayUsers.length} active</span>
              <span className="text-sm font-black text-success uppercase tracking-widest mt-0.5">Live now</span>
            </div>
          </div>
        )}

        <NotificationDropdown />
      </div>
    </div>
  )
}
