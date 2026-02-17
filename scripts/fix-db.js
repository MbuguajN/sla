const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- FIXING DEPARTMENT HEADS ---')
    // Find all managers and set them as heads if the dept has no head
    const managers = await prisma.user.findMany({
        where: { role: 'MANAGER' }
    })

    for (const manager of managers) {
        if (manager.departmentId) {
            await prisma.department.update({
                where: { id: manager.departmentId },
                data: { headId: manager.id }
            })
            console.log(`Set User ${manager.name} (ID: ${manager.id}) as Head of Dept ${manager.departmentId}`)
        }
    }

    console.log('--- MARKING EXISTING BRIEFS AS TICKETS ---')
    const updatedTasks = await prisma.task.updateMany({
        where: { isTicket: { not: true } },
        data: { isTicket: true }
    })
    console.log(`Updated ${updatedTasks.count} tasks to isTicket: true`)
}

main().finally(() => prisma.$disconnect())
