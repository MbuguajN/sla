'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  session: any
  userRole: string
  dbUser: any
  logoLight?: string | null
  logoDark?: string | null
}

const SIDEBAR_PADDING = 'px-4'
const COLLAPSED_PADDING = 'px-3'

export default function Sidebar({ session, userRole, dbUser, logoLight, logoDark }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true) // Default to collapsed
  const [isHydrated, setIsHydrated] = useState(false)
  const pathname = usePathname()

  // Load saved state from localStorage after hydration
  React.useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
    setIsHydrated(true)
  }, [])

  // Save state and update drawer classes
  React.useEffect(() => {
    if (!isHydrated) return

    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed))
    const drawer = document.querySelector('.drawer')
    if (drawer) {
      if (isCollapsed) {
        drawer.classList.add('sidebar-collapsed')
        drawer.classList.remove('sidebar-expanded')
      } else {
        drawer.classList.add('sidebar-expanded')
        drawer.classList.remove('sidebar-collapsed')
      }
    }
  }, [isCollapsed, isHydrated])

  // LOGIC: Manager View vs Employee View
  // Manager: Role is MANAGER or Department is CEO
  const isManager = userRole === 'MANAGER' || dbUser?.department?.name === 'CEO'

  // Specific role checks for legacy/admin features
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isAdmin = userRole === 'ADMIN' || isSuperAdmin
  const isCS = dbUser?.department?.name === 'CLIENT_SERVICE' || userRole === 'CLIENT_SERVICE'
  const isBusinessDev = dbUser?.department?.name === 'BUSINESS_DEVELOPMENT'

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)

  const navItems = [
    // Consolidated Home link
    { label: 'Home', href: '/', icon: Home, visible: true },

    // Brief Hub: Formerly Ticket Terminal
    { label: 'Brief Hub', href: '/client-service/tickets', icon: Inbox, visible: isAdmin || isCS || isManager },

    // Active Projects: Managers, Admins, and BDev
    { label: 'Active Projects', href: '/projects', icon: Briefcase, visible: isAdmin || isManager || isBusinessDev },

    // Global Task Overview: Admins, Managers, BDev, CS, and CEO
    { label: 'Global Task Overview', href: '/tasks', icon: ClipboardList, visible: isAdmin || isManager || isBusinessDev || isCS },

    // Department Queue: Restricted to non-admins
    {
      label: 'Department Queue',
      href: dbUser?.departmentId ? `/departments/${dbUser.departmentId}` : '/admin/departments',
      icon: Users2,
      visible: !isAdmin,
      sublabel: !dbUser?.department?.name ? 'No Dept Assigned' : null
    },

    // Admin Settings: Admins only
    { label: 'User Directory', href: '/admin/users', icon: Settings, visible: isAdmin },
    { label: 'Branding & Settings', href: '/admin/settings', icon: Settings, visible: isAdmin },
  ]

  // Filter out duplicates (Home vs Dashboard pointing to same place, pick one based on logic)
  const uniqueNavItems = navItems.filter((item, index, self) =>
    index === self.findIndex((t) => (
      t.href === item.href && t.label === item.label
    ))
  )

  return (
    <div
      className={cn(
        "drawer-side z-40 transition-all duration-300 ease-in-out border-r-2 border-primary/20 bg-base-100 shadow-[2px_0_15px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_15px_rgba(0,0,0,0.2)]",
        isCollapsed ? "lg:w-20" : "lg:w-64"
      )}
    >
      <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay" />

      {/* Sidebar Container */}
      <div className={cn(
        "min-h-full bg-base-100 text-base-content flex flex-col transition-all duration-300 ease-in-out relative overflow-y-auto overflow-x-hidden",
        "w-72 lg:w-auto", // Mobile width
        isCollapsed ? "lg:w-20" : "lg:w-64"
      )}>

        {/* ===== SIDEBAR HEADER ===== */}
        <div className={cn(
          "flex items-center pt-8 pb-6 relative transition-all duration-300",
          isCollapsed ? "lg:justify-center lg:px-2" : "justify-between",
          SIDEBAR_PADDING
        )}>
          <Link href="/" className="flex items-center w-full transition-opacity hover:opacity-80">
            <div className={cn(
              "flex items-center justify-center transition-all duration-300 w-full overflow-hidden",
              isCollapsed ? "h-12" : "h-14"
            )}>
              {/* Light Mode Logo */}
              <img
                src={logoLight || "/logo.svg"}
                alt="Logo"
                className={cn(
                  "w-full h-full object-contain dark:hidden",
                  !logoLight && "dark:invert"
                )}
              />
              {/* Dark Mode Logo */}
              <img
                src={logoDark || logoLight || "/logo.svg"}
                alt="Logo"
                className={cn(
                  "w-full h-full object-contain hidden dark:block",
                  !logoDark && !logoLight && "dark:invert"
                )}
              />
            </div>
          </Link>

          {/* Collapse Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "btn btn-circle btn-xs btn-primary border-2 border-base-100 shadow-md transition-transform hover:scale-105 hidden lg:flex shrink-0 z-50",
              isCollapsed && "absolute -right-3 top-10"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* ===== SIDEBAR CONTENT (Navigation) ===== */}
        <nav className={cn(
          "flex-1 flex flex-col",
          isCollapsed ? "lg:px-3 gap-1" : "gap-2 " + SIDEBAR_PADDING
        )}>
          {uniqueNavItems.filter(item => item.visible).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                prefetch={true}
                className={cn(
                  // Base styles
                  "flex items-center rounded-xl transition-colors duration-150",
                  // Collapsed: center icon in square button
                  isCollapsed
                    ? "lg:justify-center lg:aspect-square lg:p-0 lg:w-full"
                    : "gap-3 px-3 py-3",
                  // Active state
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-base-content/70 hover:bg-base-200/60 hover:text-base-content",
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0 transition-colors",
                    isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]",
                    isActive ? "text-white" : "text-base-content/50"
                  )}
                />

                {/* Label - hidden when collapsed */}
                <div className={cn(
                  "flex flex-col min-w-0 transition-all duration-200",
                  isCollapsed && "lg:hidden"
                )}>
                  <span className={cn(
                    "text-[11px] uppercase tracking-wide truncate",
                    isActive ? "font-bold" : "font-semibold"
                  )}>
                    {item.label}
                  </span>
                  {item.sublabel && (
                    <span className="text-[9px] text-base-content/40 italic truncate">
                      {item.sublabel}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}

          {/* New Brief Button - Restricted to BDev & Admins */}
          {(isBusinessDev || isSuperAdmin) && (
            <Link
              href="/tasks/new"
              className={cn(
                "btn btn-primary shadow-md flex items-center justify-center border-none mt-4 transition-transform hover:scale-[1.02]",
                isCollapsed
                  ? "btn-circle w-10 h-10 p-0 mx-auto"
                  : "h-10 gap-2 w-full text-[10px] uppercase tracking-wider font-extrabold"
              )}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>New Brief</span>}
            </Link>
          )}
        </nav>

        {/* ===== SIDEBAR FOOTER ===== */}
        <div className={cn(
          "mt-auto border-t border-base-200/50 py-4",
          isCollapsed ? "lg:px-3" : SIDEBAR_PADDING
        )}>
          <div className={cn(
            "flex items-center",
            isCollapsed ? "lg:justify-center" : "gap-3"
          )}>
            {/* User Avatar */}
            <div className="w-10 h-10 bg-primary text-primary-content rounded-full grid place-items-center shrink-0 overflow-hidden border border-white/10 shadow-inner">
              {dbUser?.avatarUrl ? (
                <img src={dbUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black tracking-tighter leading-none">{session.user.name?.charAt(0)}</span>
              )}
            </div>

            {/* User Info - hidden when collapsed */}
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-black truncate">
                  {session.user.name}
                </span>
                <span className="text-[10px] text-black font-bold uppercase tracking-tight opacity-50">
                  {userRole} • {dbUser?.department?.name || 'No Dept'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
