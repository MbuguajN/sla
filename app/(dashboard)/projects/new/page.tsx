import React from 'react'
import { auth } from '@/auth'
import NewProjectClient from './NewProjectClient'
import { redirect } from 'next/navigation'

export default async function NewProjectPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const userDepartment = (session.user as any).departmentName

  return <NewProjectClient userDepartment={userDepartment} />
}
