import React from 'react'
import { auth } from '@/auth'
import prisma from '@/lib/db'
import ProfileForm from './ProfileForm'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const session = await auth()
  const userId = Number(session?.user?.id)

  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) redirect('/login')

  return (
    <div className="py-10">
      <ProfileForm user={user} />
    </div>
  )
}
