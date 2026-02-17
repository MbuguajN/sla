import React from 'react'
import Link from 'next/link'
import prisma from '../lib/db'
import { auth, signOut as authSignOut } from "@/auth"
import { redirect } from 'next/navigation'
import {
  Menu as MenuIcon,
  Search,
  LogOut,
  User as UserIcon,
  ShieldCheck
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
    return <div className="p-20 text-center font-bold text-error">System Error: Auth Failure</div>
  }

  if (!session?.user) {
    redirect('/login')
  }

  const userRole = (session.user as any).role || 'EMPLOYEE'
  const userId = session.user.id ? Number(session.user.id) : null

  if (!userId) {
    return <div className="p-20 text-center font-bold text-error">System Error: Session Corrupted</div>
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

  // Fetch System Branding Settings (Logos)
  const settings = await prisma.systemSettings.findMany({
    where: {
      key: { in: ['SYSTEM_LOGO_LIGHT', 'SYSTEM_LOGO_DARK', 'SYSTEM_LOGO'] }
    }
  })

  const logoLight = settings.find(s => s.key === 'SYSTEM_LOGO_LIGHT')?.value || settings.find(s => s.key === 'SYSTEM_LOGO')?.value || null
  const logoDark = settings.find(s => s.key === 'SYSTEM_LOGO_DARK')?.value || settings.find(s => s.key === 'SYSTEM_LOGO')?.value || null

  // Fallback if user was deleted but session persists
  if (!dbUser && session.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="card bg-base-100 p-8 shadow-xl text-center border border-base-200">
          <h2 className="text-xl font-bold mb-4">Identity Out of Sync</h2>
          <form action={async () => { "use server"; await authSignOut({ redirectTo: "/login" }) }}>
            <button className="btn btn-primary">Reset Session</button>
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

        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-200 sticky top-0 z-30 px-4 lg:px-8">
          <div className="flex-none lg:hidden">
            <label htmlFor="my-drawer-2" className="btn btn-square btn-ghost">
              <MenuIcon className="w-6 h-6" />
            </label>
          </div>
          <div className="flex-1 gap-2">
            <div className="hidden lg:flex">
              <GlobalSearch />
            </div>
          </div>
          <div className="flex-none gap-4">
            <NotificationDropdown userId={userId} />

            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle border border-base-200/50 p-0 bg-base-200 overflow-hidden shadow-inner grid place-items-center w-10 h-10 min-h-0">
                {dbUser?.avatarUrl ? (
                  <img src={dbUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-base-content/60 opacity-80" />
                )}
              </div>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-200">
                <li className="menu-title px-4 py-2 text-primary font-bold">{session.user.name}</li>
                <li><Link href="/settings/profile" className="flex items-center gap-2"><UserIcon className="w-4 h-4" /> User Settings</Link></li>
                <div className="divider my-1"></div>
                <li>
                  <form action={async () => {
                    "use server"
                    await authSignOut({ redirectTo: "/login" })
                  }}>
                    <button className="text-error flex items-center gap-2 w-full">
                      <LogOut className="w-4 h-4" /> Terminate Session
                    </button>
                  </form>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-6 lg:p-10 max-w-[1600px] mx-auto w-full relative">
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
