'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Settings, Building2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Departments', href: '/admin/departments', icon: Building2 },
    { name: 'SLA Configuration', href: '/admin/sla', icon: Settings },
  ]

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
      <div className="tabs tabs-boxed bg-base-100 p-2 gap-2 border border-base-200 shadow-sm w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "tab tab-lg gap-2 font-bold transition-all duration-200 rounded-lg",
              pathname.startsWith(tab.href)
                ? "bg-primary text-primary-content shadow-md"
                : "hover:bg-base-200 text-base-content/60"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </Link>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm p-6 min-h-[500px]">
        {children}
      </div>
    </div>
  )
}
