const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function merge() {
    console.log('🔄 Merging departments...')

    // 1. Create or ensure new departments exist
    const depts = ['TECHNOLOGY', 'CREATIVE']
    for (const name of depts) {
        await prisma.department.upsert({
            where: { name },
            update: {},
            create: { name }
        })
    }

    const technology = await prisma.department.findUnique({ where: { name: 'TECHNOLOGY' } })
    const creative = await prisma.department.findUnique({ where: { name: 'CREATIVE' } })
    const tech = await prisma.department.findUnique({ where: { name: 'TECH' } })
    const design = await prisma.department.findUnique({ where: { name: 'DESIGN' } })

    // 2. Move users from TECH to TECHNOLOGY
    if (tech && technology) {
        console.log('Moving users from TECH to TECHNOLOGY...')
        await prisma.user.updateMany({
            where: { departmentId: tech.id },
            data: { departmentId: technology.id }
        })
        // Move tasks
        await prisma.task.updateMany({
            where: { departmentId: tech.id },
            data: { departmentId: technology.id }
        })
        console.log('Deleting legacy TECH department...')
        await prisma.department.delete({ where: { id: tech.id } })
    }

    // 3. Move users from DESIGN to CREATIVE
    if (design && creative) {
        console.log('Moving users from DESIGN to CREATIVE...')
        await prisma.user.updateMany({
            where: { departmentId: design.id },
            data: { departmentId: creative.id }
        })
        // Move tasks
        await prisma.task.updateMany({
            where: { departmentId: design.id },
            data: { departmentId: creative.id }
        })
        console.log('Deleting legacy DESIGN department...')
        await prisma.department.delete({ where: { id: design.id } })
    }

    console.log('✅ Merge complete.')
}

merge()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
