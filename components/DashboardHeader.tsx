'use client'

import React from 'react'
import { Users as UsersIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardHeader({ activeUsers = [] }: { activeUsers?: any[] }) {
  const displayUsers = activeUsers

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-base-200">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <UsersIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-base-content tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-base-content/50 mt-0.5">Overview of active tasks and projects</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {displayUsers.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="avatar-group -space-x-3">
              {displayUsers.map((user, i) => (
                <div key={i} className="avatar border-2 border-base-100">
                  <div className={cn("w-8 h-8 rounded-full text-white text-xs grid place-items-center", user.color || 'bg-neutral')}>
                    <span className="absolute inset-0 flex items-center justify-center leading-none font-semibold">{user.name.charAt(0)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs font-medium text-base-content/50">{displayUsers.length} online</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
