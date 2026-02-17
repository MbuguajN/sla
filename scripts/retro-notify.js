const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const tickets = await prisma.task.findMany({
        where: { isTicket: true, status: 'PENDING' }
    })

    for (const ticket of tickets) {
        if (ticket.departmentId) {
            const dept = await prisma.department.findUnique({
                where: { id: ticket.departmentId }
            })
            if (dept && dept.headId) {
                await prisma.notification.create({
                    data: {
                        userId: dept.headId,
                        content: `New Brief Assigned: ${ticket.title}`,
                        type: 'TASK_ASSIGNED',
                        // Bypassing link due to Prisma generation file lock
                        isRead: false
                    }
                })
                console.log(`Retro-notified user ${dept.headId} about ticket ${ticket.id}`)
            }
        }
    }
}

main().finally(() => prisma.$disconnect())
