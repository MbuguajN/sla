export const dynamic = 'force-dynamic'
import React from 'react'
import prisma from '@/lib/db'
import AddUserModal from '@/components/admin/AddUserModal'
import UserListTable from '@/components/admin/UserListTable'
import { Users2, Shield, UserPlus } from 'lucide-react'

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: { department: true },
    orderBy: { createdAt: 'desc' }
  })

  const departments = await prisma.department.findMany()

  return (
    <div className="space-y-8 pb-20 animate-fade-in-up">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden glass-panel rounded-3xl p-8 md:p-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 blur-[60px] rounded-full -ml-24 -mb-24" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary text-white rounded-3xl flex items-center justify-center shadow-ruby-soft shrink-0">
              <Users2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-base-content mb-0">Directory</h1>
              <p className="text-sm font-bold text-base-content/30 uppercase tracking-[0.2em] mt-1">Personnel & Organizational Structure</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-base-100/50 backdrop-blur-sm rounded-2xl px-6 py-3 ring-1 ring-primary/10 flex flex-col items-center">
              <span className="text-xs uppercase font-black tracking-[0.3em] text-base-content/70 mb-1">Total Staff</span>
              <span className="text-2xl font-black tracking-tighter text-primary">{users.length}</span>
            </div>
            <AddUserModal departments={departments} />
          </div>
        </div>
      </div>

      <UserListTable users={users} departments={departments} />
    </div>
  )
}
