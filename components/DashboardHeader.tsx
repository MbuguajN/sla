'use client'

import React from 'react'
import { Users as UsersIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardHeader({ activeUsers = [] }: { activeUsers?: any[] }) {
  // Real-time active users only - no placeholders
  const displayUsers = activeUsers

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-base-200">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-primary/10 rounded-[1.25rem] flex items-center justify-center text-primary border border-primary/20 shadow-xl shadow-primary/5">
          <UsersIcon className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-base-content tracking-tighter uppercase leading-none">5DM Operations</h1>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Active</span>
          <div className="flex items-center gap-3">
            <div className="avatar-group -space-x-4 rtl:space-x-reverse">
              {displayUsers.map((user, i) => (
                <div
                  key={i}
                  className={cn(
                    "avatar border-4 border-base-100 transition-transform hover:scale-110 hover:z-10 cursor-pointer animate-in zoom-in-50 duration-500",
                    `delay-[${i * 100}ms]`
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-full text-white font-black text-[10px] grid place-items-center shadow-inner relative", user.color || 'bg-neutral')}>
                    <span className="absolute inset-0 flex items-center justify-center leading-none">{user.name.charAt(0)}</span>
                  </div>
                </div>
              ))}
              {displayUsers.length === 0 && (
                <div className="text-[10px] font-black uppercase tracking-widest text-base-content/20">Standalone Mode</div>
              )}
            </div>
            {displayUsers.length > 0 && (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                <span className="text-[10px] font-black uppercase text-success/80 tracking-widest">{displayUsers.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
