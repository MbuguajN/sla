const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const depts = await prisma.department.findMany()
    console.log('DEPARTMENTS:', JSON.stringify(depts, null, 2))

    const tickets = await prisma.task.findMany({
        where: { isTicket: true }
    })
    console.log('TICKETS:', JSON.stringify(tickets, null, 2))

    const users = await prisma.user.findMany({
        select: { id: true, name: true, role: true, departmentId: true }
    })
    console.log('USERS:', JSON.stringify(users, null, 2))
}

main().finally(() => prisma.$disconnect())
