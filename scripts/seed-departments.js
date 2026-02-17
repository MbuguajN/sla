
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const matchDepartment = {
    'CEO': 'CEO',
    'BUSINESS_DEVELOPMENT': 'Business Development',
    'MEDIA': 'Media',
    'CLIENT_SERVICE': 'Client Service',
    'TECHNOLOGY': 'Technology',
    'CREATIVE': 'Creative',
    'CONTENT': 'Content',
    'HR': 'Human Resources',
    'ACCOUNTS': 'Accounts'
}

async function main() {
    console.log('Seeding departments...')

    for (const [key, displayName] of Object.entries(matchDepartment)) {
        const dept = await prisma.department.upsert({
            where: { name: key },
            update: {},
            create: {
                name: key,
            }
        })
        console.log(`Ensured department: ${key} (${displayName})`)
    }

    // Optional: Clean up old test departments if needed, or just leave them. 
    // For now we just ensure the new ones exist.

    console.log('Seeding completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
