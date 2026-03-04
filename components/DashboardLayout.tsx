'use server'

import React from 'react'
import Link from 'next/link'
import prisma from '../lib/db'
import { auth, signOut as authSignOut } from "@/auth"
import { redirect } from 'next/navigation'
import {
  Menu as MenuIcon,
  LogOut,
  User as UserIcon,
  Search,
} from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import Sidebar from './Sidebar'
import InactivityLogout from './InactivityLogout'
import PresenceHeartbeat from './PresenceHeartbeat'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    session = await auth()
  } catch (err) {
    console.error("Auth initialization failed:", err)
    return <div className="p-20 text-center font-semibold text-error">System Error: Auth Failure</div>
  }

  if (!session?.user) {
    redirect('/login')
  }

  const userRole = (session.user as any).role || 'EMPLOYEE'
  const userId = session.user.id ? Number(session.user.id) : null

  if (!userId) {
    return <div className="p-20 text-center font-semibold text-error">System Error: Session Corrupted</div>
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      departmentId: true,
      department: {
        select: {
          id: true,
          name: true,
          headId: true
        }
      }
    }
  })

  const settings = await prisma.systemSettings.findMany({
    where: {
      key: { in: ['SYSTEM_LOGO_LIGHT', 'SYSTEM_LOGO_DARK', 'SYSTEM_LOGO'] }
    }
  })

  const logoLight = settings.find(s => s.key === 'SYSTEM_LOGO_LIGHT')?.value || settings.find(s => s.key === 'SYSTEM_LOGO')?.value || null
  const logoDark = settings.find(s => s.key === 'SYSTEM_LOGO_DARK')?.value || settings.find(s => s.key === 'SYSTEM_LOGO')?.value || null

  if (!dbUser && session.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="glass-card max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
            <UserIcon size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-4">Session Out of Sync</h2>
          <p className="text-base-content/50 mb-8 text-sm px-6">Your session data doesn't match our records. Please sign out and try again.</p>
          <form action={async () => { "use server"; await authSignOut({ redirectTo: "/login" }) }}>
            <button className="btn btn-primary w-full h-12 rounded-xl text-sm font-bold uppercase tracking-wider">Sign Out & Retry</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="drawer lg:drawer-open font-sans bg-base-100 min-h-screen">
      <InactivityLogout />
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col relative">
        {/* Mobile Navbar Only */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-base-100/80 backdrop-blur-md sticky top-0 z-40 border-b border-base-200">
          <label htmlFor="my-drawer-2" className="btn btn-square btn-ghost">
            <MenuIcon className="w-6 h-6" />
          </label>
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Search size={18} />
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto relative px-4 py-6 md:px-8 lg:px-12 lg:py-10">
          <PresenceHeartbeat />
          {children}
        </main>
      </div>

      <Sidebar
        session={session}
        userRole={userRole}
        dbUser={dbUser}
        logoLight={logoLight}
        logoDark={logoDark}
      />
    </div>
  )
}
