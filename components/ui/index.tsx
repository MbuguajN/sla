export * from "./button"
export * from "./card"
export * from "./input"
export * from "./select"
export * from "./badge"

import React from 'react'

export function Sidebar({ children }: { children: React.ReactNode }) {
  return <aside className="w-64 bg-slate-50 border-r p-4">{children}</aside>
}

export function Topbar({ children }: { children: React.ReactNode }) {
  return <div className="w-full border-b p-3 bg-white">{children}</div>
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="block py-2 px-2 rounded hover:bg-slate-100">
      {children}
    </a>
  )
}
