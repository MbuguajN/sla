import React from 'react'
import Link from 'next/link'
import prisma from '../lib/db'
import { auth, signOut as authSignOut } from "@/auth"
import { redirect } from 'next/navigation'
import {
  Menu as MenuIcon,
  LogOut,
  User as UserIcon,
} from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
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
        <div className="card bg-base-100 p-8 shadow-lg text-center border border-base-200 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4">Session Out of Sync</h2>
          <form action={async () => { "use server"; await authSignOut({ redirectTo: "/login" }) }}>
            <button className="btn btn-primary">Sign Out & Retry</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="drawer lg:drawer-open font-sans">
      <InactivityLogout />
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col bg-base-100">

        {/* Top Navbar */}
        <div className="navbar bg-base-100 sticky top-0 z-30 px-4 lg:px-8 border-b border-base-200">
          <div className="flex-none lg:hidden">
            <label htmlFor="my-drawer-2" className="btn btn-square btn-ghost">
              <MenuIcon className="w-5 h-5" />
            </label>
          </div>
          <div className="flex-1 gap-2">
            <div className="hidden lg:flex">
              <GlobalSearch />
            </div>
          </div>
          <div className="flex-none gap-3">
            <NotificationDropdown userId={userId} />

            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle p-0 bg-base-200 overflow-hidden w-9 h-9 min-h-0 border border-base-300">
                {dbUser?.avatarUrl ? (
                  <img src={dbUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-base-content/50" />
                )}
              </div>
              <div tabIndex={0} className="mt-3 z-[1] p-2 shadow-lg dropdown-content bg-base-100 rounded-xl w-56 border border-base-200">
                <div className="px-3 py-2 text-sm font-semibold text-base-content">{session.user.name}</div>
                <div className="border-b border-base-200 my-1" />
                <Link href="/settings/profile" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-base-200 transition-colors">
                  <UserIcon className="w-4 h-4" /> Profile
                </Link>
                <div className="border-b border-base-200 my-1" />
                <form action={async () => {
                  "use server"
                  await authSignOut({ redirectTo: "/login" })
                }}>
                  <button className="text-error flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-error/10 transition-colors font-medium">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="px-6 py-6 lg:px-10 lg:py-8 max-w-[1600px] mx-auto w-full relative">
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
