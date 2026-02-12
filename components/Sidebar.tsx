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
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  session: any
  userRole: string
  dbUser: any
}

// Consistent spacing constants
const SIDEBAR_PADDING = 'px-4'
const COLLAPSED_PADDING = 'px-3'

export default function Sidebar({ session, userRole, dbUser }: SidebarProps) {
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

  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isAdmin = userRole === 'ADMIN' || isSuperAdmin
  const isCSDept = dbUser?.department?.name === 'CLIENT SERVICE' || dbUser?.department?.name === 'CLIENT_SERVICE'
  const isCS = userRole === 'CLIENT_SERVICE' || isCSDept

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)

  const navItems = [
    { label: 'Home', href: '/', icon: Home, visible: !isCS },
    { label: 'Dashboard', href: '/', icon: Home, visible: isCS },
    { label: 'Ticket Terminal', href: '/client-service/tickets', icon: Inbox, visible: isAdmin || isCS },
    { label: 'Active Projects', href: '/projects', icon: Briefcase, visible: isAdmin || isCS },
    { label: 'Global Task Index', href: '/tasks', icon: ClipboardList, visible: isAdmin || isCS },
    { 
      label: 'Department Queue', 
      href: dbUser?.departmentId ? `/departments/${dbUser.departmentId}` : '/admin/departments', 
      icon: Users2, 
      visible: true,
      sublabel: !dbUser?.department?.name ? 'No Dept Assigned' : null
    },
    { label: 'Admin Settings', href: '/admin/users', icon: Settings, visible: isAdmin },
    { label: 'Gmail Settings', href: '/admin/settings/gmail', icon: Mail, visible: isAdmin },
  ]

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
          "flex items-center pt-8 pb-6 relative",
          isCollapsed ? "lg:justify-center lg:px-3" : "justify-between",
          SIDEBAR_PADDING
        )}>
          <Link href={isCS ? "/client-service/tickets" : "/"} className="flex items-center gap-3 transition-opacity hover:opacity-80">
            {isCollapsed ? (
              <div className="w-12 h-12 bg-primary text-white flex items-center justify-center rounded-xl shadow-md overflow-hidden font-black text-[9px]">
                5DM
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-base-content">5DM AFRICA</span>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              </div>
            )}
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
          {navItems.filter(item => item.visible).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon
            
            return (
              <Link 
                key={item.href}
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
                    : "text-black hover:bg-base-200/60 hover:text-black",
                )}
              >
                <Icon 
                  className={cn(
                    "shrink-0 transition-colors",
                    isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]",
                    isActive ? "text-white" : "text-black"
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
                    <span className="text-[9px] text-black italic truncate">
                      {item.sublabel}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}

          {/* New Task Button */}
          {(isAdmin || isCS || userRole === 'DEPT_HEAD') && (
            <Link 
              href="/tasks/new" 
              className={cn(
                "btn btn-primary shadow-md flex items-center justify-center border-none mt-4 transition-transform hover:scale-[1.02]",
                isCollapsed 
                  ? "btn-circle w-10 h-10 p-0 mx-auto" 
                  : "h-10 gap-2 w-full text-[10px] uppercase tracking-wider font-bold"
              )}
            >
              <FileText className="w-4 h-4 shrink-0" /> 
              {!isCollapsed && <span>New Task</span>}
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
            <div className="w-9 h-9 bg-primary text-primary-content rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-white/20">
              {dbUser?.avatarUrl ? (
                <img src={dbUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold flex items-center justify-center">{session.user.name?.charAt(0)}</span>
              )}
            </div>
            
            {/* User Info - hidden when collapsed */}
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-black truncate">
                  {session.user.name}
                </span>
                <span className="text-[10px] text-black font-bold uppercase tracking-tight">
                  {userRole}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
