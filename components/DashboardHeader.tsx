'use client'

import React from 'react'
import { Users as UsersIcon, Search, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import NotificationDropdown from './NotificationDropdown'

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
          <div className="hidden lg:flex items-center gap-3 bg-base-content/5 px-4 py-2 rounded-2xl border border-base-content/5 whitespace-nowrap">
            <div className="avatar-group -space-x-3">
              {displayUsers.slice(0, 3).map((user, i) => (
                <div key={i} className="avatar ring-2 ring-base-100 ring-offset-0">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center leading-none shadow-sm overflow-hidden", user.color || 'bg-neutral')}>
                    <span className="text-[11px] font-black flex items-center justify-center w-full h-full text-white drop-shadow-sm translate-y-[0.5px]">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                </div>
              ))}
              {displayUsers.length > 3 && (
                <div className="avatar ring-2 ring-base-100">
                  <div className="w-8 h-8 rounded-full bg-base-300 text-base-content flex items-center justify-center leading-none font-bold overflow-hidden">
                    <span className="text-[9px] font-black flex items-center justify-center w-full h-full">
                      +{displayUsers.length - 3}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[12px] font-bold leading-none">{displayUsers.length} active</span>
              <span className="text-[8px] font-black text-success uppercase tracking-widest mt-0.5">Live now</span>
            </div>
          </div>
        )}

        <NotificationDropdown />
      </div>
    </div>
  )
}
