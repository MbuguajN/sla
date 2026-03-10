'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { signOut } from 'next-auth/react'
import {
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  Briefcase,
  Users2,
  Inbox,
  Sun,
  Moon,
  Plus,
  LogOut,
  ShieldAlert,
  Heart,
  HelpCircle,
  Star,
  DollarSign,
  ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoadingBreadcrumb } from '@/components/ui/animated-loading-svg-text-shimmer'

interface SidebarProps {
  session: any
  userRole: string
  dbUser: any
  logoLight?: string | null
  logoDark?: string | null
  hasActiveReview?: boolean
}

export default function Sidebar({ session, userRole, dbUser, logoLight, logoDark, hasActiveReview }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setIsCollapsed(JSON.parse(saved))
    setIsHydrated(true)
  }, [])

  useEffect(() => {
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
  const isManager = userRole === 'MANAGER' || isAdmin || isCEO
  const isCS = dbUser?.department?.name === 'CLIENT_SERVICE'
  const isBusinessDev = dbUser?.department?.name === 'BUSINESS_DEVELOPMENT'
  const isFinance = dbUser?.department?.name === 'FINANCE' || userRole === 'FINANCE'

  // HR gets a completely separate nav — only HR-specific pages
  const navItems = isHR ? [
    { label: 'HR Dashboard', href: '/hr', icon: Heart, visible: true },
    { label: 'Leave Requests', href: '/hr/leaves', icon: ClipboardList, visible: true },
    { label: 'Suggestions', href: '/hr/suggestions', icon: Inbox, visible: true },
    { label: 'Reviews', href: '/hr/reviews', icon: Star, visible: true },
  ] : [
    { label: 'Overview', href: '/', icon: Home, visible: true },
    { label: 'Briefs', href: '/client-service/tickets', icon: Inbox, visible: (isAdmin || isCS || isManager) && !isCEO },
    { label: 'Active Projects', href: '/projects', icon: Briefcase, visible: isAdmin || isManager || isBusinessDev || (dbUser?.projectMemberships?.length ?? 0) > 0 },
    { label: 'All Tasks', href: '/tasks', icon: ClipboardList, visible: isAdmin || isCEO || isManager || isBusinessDev || isCS },
    { label: 'Finance Pool', href: '/finance-pool', icon: DollarSign, visible: isAdmin || isFinance },
    { label: 'Exec Review', href: '/executive-review', icon: ShieldCheck, visible: isCEO || isAdmin },
    { label: 'Reviews', href: '/reviews', icon: Star, visible: !!hasActiveReview },
    {
      label: 'Department',
      href: dbUser?.departmentId ? `/departments/${dbUser.departmentId}` : '/admin/departments',
      icon: Users2,
      visible: !(isAdmin || isCEO || isFinance),
    },
    { label: 'System', href: '/admin/settings', icon: Settings, visible: isAdmin || isHR },
  ]

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <>
      {isLoggingOut && (
        <div className="fixed inset-0 z-[1000] bg-base-100/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <LoadingBreadcrumb text="Signing Out" className="scale-150" />
        </div>
      )}
      <div
        className={cn(
          "drawer-side z-50 transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] overflow-visible",
          isCollapsed ? "lg:w-24" : "lg:w-72"
        )}
      >
        <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay" />

        <div className={cn(
          "min-h-[calc(100vh-2rem)] m-4 glass-panel rounded-3xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] relative overflow-visible",
          "w-72 lg:w-auto",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}>
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent" />
          </div>

          {/* Logo */}
          <div className={cn(
            "flex items-center pt-8 pb-6 relative transition-all duration-300 px-6",
            isCollapsed ? "lg:justify-center lg:px-2" : "justify-between"
          )}>
            <Link href="/" className="flex items-center group">
              <div className={cn(
                "flex items-center justify-center transition-all duration-500 overflow-hidden",
                isCollapsed ? "h-14 w-14" : "h-14"
              )}>
                {isHydrated && theme === 'dark' ? (
                  logoDark ? (
                    <img src={logoDark} alt="5DM" className="max-w-full max-h-full object-contain transform group-hover:scale-110 transition-transform duration-500 shadow-sm" />
                  ) : (
                    <div className="text-2xl font-black tracking-tighter text-white">5DM</div>
                  )
                ) : (
                  logoLight ? (
                    <img src={logoLight} alt="5DM" className="max-w-full max-h-full object-contain transform group-hover:scale-110 transition-transform duration-500 shadow-sm" />
                  ) : (
                    <div className="text-2xl font-black tracking-tighter text-primary">5DM</div>
                  )
                )}
              </div>
            </Link>

            {!isCollapsed && (
              <button onClick={() => setIsCollapsed(true)} className="btn btn-ghost btn-xs btn-circle text-base-content/30 hover:text-primary transition-colors">
                <ChevronLeft size={16} />
              </button>
            )}
            {isCollapsed && (
              <button onClick={() => setIsCollapsed(false)} className="absolute -right-4 top-1/2 -translate-y-1/2 btn btn-circle btn-xs glass-panel shadow-ruby-soft text-primary z-[60] border-primary/20 hover:scale-110 active:scale-95 transition-all">
                <ChevronRight size={10} />
              </button>
            )}
          </div>

          {/* Navigation — no scrollbar */}
          <nav className={cn("flex-1 flex flex-col py-4 px-4 gap-1.5 overflow-visible", isCollapsed ? "items-center" : "")}>
            {navItems.filter(item => item.visible).map((item) => {
              // Dashboard/home routes: exact match only; sub-page routes: prefix match
              const exactMatchRoutes = ['/', '/hr']
              const isActive = exactMatchRoutes.includes(item.href)
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl transition-all duration-200 active:scale-[0.98]",
                    isCollapsed ? "w-10 h-10 justify-center" : "w-full px-4 py-2.5",
                    isActive ? "bg-primary text-primary-content shadow-ruby-soft" : "text-base-content/80 hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <Icon className="shrink-0 w-[18px] h-[18px]" />
                  {!isCollapsed && (
                    <span className={cn("text-[13px] tracking-tight truncate", isActive ? "font-bold" : "font-medium")}>{item.label}</span>
                  )}
                  {isActive && !isCollapsed && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                  )}
                </Link>
              )
            })}

            {/* New Brief button */}
            {(isBusinessDev || isCS) && (
              <div className={cn("mt-4", isCollapsed ? "w-full flex justify-center" : "px-2")}>
                <Link
                  href="/tasks/new"
                  className={cn(
                    "flex items-center justify-center transition-all duration-300 shadow-ruby-soft",
                    isCollapsed ? "w-10 h-10 rounded-xl bg-primary text-white hover:rotate-90" : "w-full h-11 rounded-2xl bg-primary text-white gap-3 px-4 hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  <Plus className={isCollapsed ? "w-4 h-4" : "w-5 h-5"} />
                  {!isCollapsed && <span className="text-[13px] font-bold uppercase tracking-wider">New Brief</span>}
                </Link>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className={cn("mt-auto pt-4 pb-8 px-4 flex flex-col gap-4", isCollapsed ? "items-center" : "")}>
            {/* Theme Toggle */}
            <div className={cn("p-1 rounded-2xl bg-base-content/5 flex items-center gap-1", isCollapsed ? "flex-col" : "w-full")}>
              <button onClick={() => setTheme('light')} className={cn("flex-1 h-8 rounded-xl flex items-center justify-center transition-all", theme === 'light' ? "bg-white text-primary shadow-sm" : "text-base-content/70 hover:text-base-content")}>
                <Sun size={14} />
              </button>
              <button onClick={() => setTheme('dark')} className={cn("flex-1 h-8 rounded-xl flex items-center justify-center transition-all", theme === 'dark' ? "bg-primary text-white shadow-ruby-soft" : "text-base-content/70 hover:text-base-content")}>
                <Moon size={14} />
              </button>
            </div>

            {/* User Profile — Portal menu */}
            <UserMenu session={session} dbUser={dbUser} userRole={userRole} isCollapsed={isCollapsed} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </>
  )
}

function UserMenu({ session, dbUser, userRole, isCollapsed, onLogout }: { session: any; dbUser: any; userRole: string; isCollapsed: boolean; onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      if (isCollapsed) {
        setCoords({ top: rect.top - 100, left: rect.right + 12 })
      } else {
        setCoords({ top: rect.top - 110, left: rect.left })
      }
    }
  }, [isOpen, isCollapsed])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (buttonRef.current && !buttonRef.current.contains(t) && menuRef.current && !menuRef.current.contains(t)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [isOpen])

  const menu = (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
      className="menu p-2 shadow-2xl bg-base-100 !bg-opacity-100 rounded-2xl w-56 border border-base-content/10 animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="px-4 py-2 text-sm font-bold uppercase tracking-widest opacity-40">User Account</div>
      <Link href="/account" onClick={() => setIsOpen(false)} className="rounded-xl flex items-center gap-3 py-2.5 px-3 hover:bg-primary/5 hover:text-primary transition-colors text-[13px] font-bold">
        <div className="w-7 h-7 bg-base-content/5 rounded-full flex items-center justify-center"><Users2 size={14} /></div>
        My Account
      </Link>
      <button onClick={() => { setIsOpen(false); onLogout(); }} className="rounded-xl flex items-center gap-3 py-2.5 px-3 hover:bg-error/5 text-error transition-colors text-[13px] font-bold w-full text-left">
        <div className="w-7 h-7 bg-error/5 rounded-full flex items-center justify-center"><LogOut size={14} /></div>
        Logout
      </button>
    </div>
  )

  return (
    <div className="w-full">
      <div
        ref={buttonRef}
        role="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn("flex items-center gap-3 p-2 rounded-2xl hover:bg-base-content/5 transition-colors cursor-pointer", isCollapsed ? "justify-center" : "")}
      >
        <div className="relative">
          <div className={cn("ring-2 ring-primary/20 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 overflow-hidden", isCollapsed ? "w-8 h-8" : "w-9 h-9")}>
            {dbUser?.avatarUrl ? (
              <img src={dbUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className={cn("font-black flex items-center justify-center w-full h-full leading-none translate-y-[0.5px]", isCollapsed ? "text-sm" : "text-xs")}>{session.user.name?.charAt(0)}</span>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-base-100" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold text-base-content/90 truncate">{session.user.name}</span>
            <span className="text-sm text-primary font-bold uppercase tracking-widest opacity-70">{dbUser?.department?.name?.replace(/_/g, ' ') || userRole}</span>
          </div>
        )}
      </div>
      {mounted && isOpen && createPortal(menu, document.body)}
    </div>
  )
}
