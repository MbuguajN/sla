'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Settings, Building2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LimelightNav } from '@/components/ui/limelight-nav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { id: 'settings', label: 'General System', href: '/admin/settings', icon: <Settings /> },
    { id: 'users', label: 'User Management', href: '/admin/users', icon: <Users /> },
    { id: 'departments', label: 'Departments', href: '/admin/departments', icon: <Building2 /> },
    { id: 'sla', label: 'SLA Configuration', href: '/admin/sla', icon: <Settings /> },
  ]

  const activeIndex = tabs.findIndex(tab => pathname.startsWith(tab.href))

  return (
    <div className="flex flex-col gap-8">
      {/* Admin Header */}
      <div className="flex items-center gap-4 border-b border-base-200 pb-6">
        <div className="w-12 h-12 bg-primary text-primary-content rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-base-content uppercase">5DM Administration</h1>
          <p className="text-sm font-medium text-base-content/60">System Administration & Configuration</p>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex justify-center md:justify-start">
        <LimelightNav
          items={tabs}
          defaultActiveIndex={activeIndex !== -1 ? activeIndex : 0}
          activeColor="#be1e3d"
        />
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in duration-500">
        {children}
      </div>
    </div>
  )
}
