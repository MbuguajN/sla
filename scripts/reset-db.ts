import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Starting operational data purge...')

    try {
        // Order matters due to foreign key constraints

        console.log('🗑️ Purging Requisitions...')
        await prisma.requisitionItem.deleteMany({})
        await prisma.requisition.deleteMany({})

        console.log('🗑️ Purging Task system...')
        await prisma.watcher.deleteMany({})
        await prisma.attachment.deleteMany({})
        await prisma.auditLog.deleteMany({})
        await prisma.message.deleteMany({})
        await prisma.task.deleteMany({})

        console.log('🗑️ Purging Project system...')
        await prisma.projectMember.deleteMany({})
        await prisma.subProject.deleteMany({})
        await prisma.project.deleteMany({})

        console.log('🗑️ Purging HR data...')
        await prisma.reviewResponse.deleteMany({})
        await prisma.reviewQuestion.deleteMany({})
        await prisma.reviewCycle.deleteMany({})
        await prisma.suggestion.deleteMany({})
        await prisma.leaveRequest.deleteMany({})

        console.log('🗑️ Purging IT Support...')
        await prisma.iTSupportRequest.deleteMany({})

        console.log('🗑️ Purging Stories...')
        await prisma.story.deleteMany({})

        console.log('✅ Operational data cleared. Users, Departments, SLAs, and Policies preserved.')
    } catch (error) {
        console.error('❌ Data purge failed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
