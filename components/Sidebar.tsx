'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  ClipboardList,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  Home,
  Briefcase,
  Users2,
  Inbox,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  session: any
  userRole: string
  dbUser: any
  logoLight?: string | null
  logoDark?: string | null
}

export default function Sidebar({ session, userRole, dbUser, logoLight, logoDark }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setIsCollapsed(JSON.parse(saved))
    setIsHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!isHydrated) return
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed))
    const drawer = document.querySelector('.drawer')
    if (drawer) {
      drawer.classList.toggle('sidebar-collapsed', isCollapsed)
      drawer.classList.toggle('sidebar-expanded', !isCollapsed)
    }
  }, [isCollapsed, isHydrated])

  const isAdmin = userRole === 'ADMIN'
  const isCEO = userRole === 'CEO'
  const isHR = userRole === 'HR'
  const isManager = userRole === 'MANAGER' || isAdmin || isCEO || isHR
  const isCS = dbUser?.department?.name === 'CLIENT_SERVICE'
  const isBusinessDev = dbUser?.department?.name === 'BUSINESS_DEVELOPMENT'

  const navItems = [
    { label: 'Home', href: '/', icon: Home, visible: true },
    { label: 'Brief Hub', href: '/client-service/tickets', icon: Inbox, visible: isAdmin || isCS || isManager },
    { label: 'Active Projects', href: '/projects', icon: Briefcase, visible: isAdmin || isManager || isBusinessDev },
    { label: 'Global Tasks', href: '/tasks', icon: ClipboardList, visible: isAdmin || isCEO || isHR || isManager || isBusinessDev || isCS },
    {
      label: 'Department Queue',
      href: dbUser?.departmentId ? `/departments/${dbUser.departmentId}` : '/admin/departments',
      icon: Users2,
      visible: !(isAdmin || isCEO || isHR),
    },
    { label: 'User Directory', href: '/admin/users', icon: Settings, visible: isAdmin || isHR },
    { label: 'Settings', href: '/admin/settings', icon: Settings, visible: isAdmin },
  ]

  return (
    <div
      className={cn(
        "drawer-side z-40 transition-all duration-300 ease-in-out border-r border-base-200 bg-base-100",
        isCollapsed ? "lg:w-20" : "lg:w-64"
      )}
    >
      <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay" />

      <div className={cn(
        "min-h-full bg-base-100 text-base-content flex flex-col transition-all duration-300 ease-in-out relative overflow-y-auto overflow-x-hidden",
        "w-72 lg:w-auto",
        isCollapsed ? "lg:w-20" : "lg:w-64"
      )}>

        {/* Header / Logo */}
        <div className={cn(
          "flex items-center pt-6 pb-5 relative transition-all duration-300",
          isCollapsed ? "lg:justify-center lg:px-2" : "justify-between px-4"
        )}>
          <Link href="/" className="flex items-center w-full">
            <div className={cn(
              "flex items-center justify-center transition-all duration-300 w-full overflow-hidden",
              isCollapsed ? "h-10 w-10 mx-auto" : "h-14 px-4"
            )}>
              <img
                src={logoLight || "/logo.svg"}
                alt="Logo"
                className="max-w-full max-h-full object-contain dark:hidden"
              />
              <img
                src={logoDark || logoLight || "/logo.svg"}
                alt="Logo"
                className="max-w-full max-h-full object-contain hidden dark:block"
              />
            </div>
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "btn btn-circle btn-xs bg-base-200 border border-base-300 shadow-sm hidden lg:flex shrink-0 z-50 hover:bg-base-300 transition-colors",
              isCollapsed && "absolute -right-3 top-8"
            )}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-b border-base-200 mb-2" />

        {/* Navigation */}
        <nav className={cn(
          "flex-1 flex flex-col py-2",
          isCollapsed ? "lg:px-3 gap-1" : "gap-0.5 px-3"
        )}>
          {navItems.filter(item => item.visible).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center rounded-lg transition-colors duration-150",
                  isCollapsed
                    ? "lg:justify-center lg:aspect-square lg:p-0 lg:w-full"
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-primary text-primary-content"
                    : "text-base-content/70 hover:bg-base-200 hover:text-base-content",
                )}
              >
                <Icon className={cn(
                  "shrink-0",
                  isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]",
                  isActive ? "text-primary-content" : "text-base-content/50"
                )} />
                <div className={cn(
                  "flex flex-col min-w-0 transition-all duration-200",
                  isCollapsed && "lg:hidden"
                )}>
                  <span className={cn(
                    "text-[13px] tracking-normal truncate",
                    isActive ? "font-semibold" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                </div>
              </Link>
            )
          })}

          {/* New Brief Button */}
          {(isBusinessDev || isCS || isManager || isAdmin || isCEO) && (
            <Link
              href="/tasks/new"
              className={cn(
                "btn btn-primary flex items-center justify-center border-none mt-4 shadow-sm",
                isCollapsed
                  ? "btn-circle w-10 h-10 p-0 mx-auto"
                  : "h-10 gap-2 w-full text-xs font-semibold"
              )}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>New Brief</span>}
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className={cn(
          "mt-auto border-t border-base-200 pt-3 pb-4",
          isCollapsed ? "lg:px-3" : "px-4"
        )}>
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn(
              "btn btn-ghost btn-sm w-full mb-3 gap-2 text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors",
              isCollapsed && "btn-circle lg:w-10 lg:h-10 lg:p-0"
            )}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!isCollapsed && <span className="text-xs font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {/* User Info */}
          <div className={cn(
            "flex items-center",
            isCollapsed ? "lg:justify-center" : "gap-3"
          )}>
            <div className="w-9 h-9 bg-primary text-primary-content rounded-full grid place-items-center shrink-0 overflow-hidden">
              {dbUser?.avatarUrl ? (
                <img src={dbUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold leading-none">{session.user.name?.charAt(0)}</span>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-base-content truncate">
                  {session.user.name}
                </span>
                <span className="text-[11px] text-base-content/50 font-medium truncate">
                  {dbUser?.department?.name?.replace(/_/g, ' ') || userRole}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
