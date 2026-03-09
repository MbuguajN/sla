import React from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import { getMyLeaveRequests } from '@/app/actions/hrActions'
import { getMySuggestions } from '@/app/actions/suggestionActions'
import { getMyITRequests } from '@/app/actions/itSupportActions'
import { getMyRequisitions } from '@/app/actions/financeActions'
import AccountClient from './AccountClient'

export default async function AccountPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const userId = Number(session.user.id)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: { select: { name: true } } }
    })

    const [leaves, suggestions, itRequests, requisitions] = await Promise.all([
        getMyLeaveRequests(),
        getMySuggestions(),
        getMyITRequests(),
        getMyRequisitions()
    ])

    return (
        <div className="space-y-8 pb-20 animate-fade-in-up">
            <AccountClient
                user={JSON.parse(JSON.stringify(user))}
                leaves={JSON.parse(JSON.stringify(leaves))}
                suggestions={JSON.parse(JSON.stringify(suggestions))}
                itRequests={JSON.parse(JSON.stringify(itRequests))}
                requisitions={JSON.parse(JSON.stringify(requisitions))}
            />
        </div>
    )
}
