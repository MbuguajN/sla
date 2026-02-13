export const dynamic = 'force-dynamic'
import React from 'react'
import prisma from '@/lib/db'
import AddUserModal from '@/components/admin/AddUserModal'
import UserListTable from '@/components/admin/UserListTable'

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: { department: true },
    orderBy: { createdAt: 'desc' }
  })

  const departments = await prisma.department.findMany()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">System Users</h2>
          <p className="text-sm opacity-60">Manage access and organizational structure</p>
        </div>
        <AddUserModal departments={departments} />
      </div>

      <UserListTable users={users} departments={departments} />
    </div>
  )
}
