
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('james123', 10)
    const user = await prisma.user.upsert({
        where: { email: 'james@example.com' },
        update: { password: hashedPassword },
        create: {
            email: 'james@example.com',
            name: 'James',
            password: hashedPassword,
            role: 'ADMIN'
        }
    })
    console.log('User guaranteed:', user.email)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
