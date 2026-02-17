import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- DEPARTMENTS ---')
    const depts = await prisma.department.findMany({
        include: { head: { select: { id: true, name: true, role: true } } }
    })
    console.table(depts.map(d => ({
        id: d.id,
        name: d.name,
        headId: d.headId,
        headName: d.head?.name,
        headRole: d.head?.role
    })))

    console.log('\n--- TASKS (TICKETS) ---')
    const tickets = await prisma.task.findMany({
        where: { isTicket: true },
        select: { id: true, title: true, status: true, departmentId: true }
    })
    console.table(tickets)

    console.log('\n--- ALL USERS ---')
    const users = await prisma.user.findMany({
        select: { id: true, name: true, role: true, departmentId: true }
    })
    console.table(users)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
