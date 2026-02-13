export const dynamic = 'force-dynamic'
import React from 'react'
import prisma from '@/lib/db'
import DepartmentsPageClient from '@/components/admin/DepartmentsPageClient'

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    include: { users: true },
    orderBy: { name: 'asc' }
  })

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' }
  })

  return <DepartmentsPageClient initialDepartments={departments} users={users} />
}
