const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: 1 }, // Admin ID is 1
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        console.log('Recent Notifications for Admin (ID: 1):');
        notifications.forEach(n => {
            console.log(`[${n.createdAt.toISOString()}] Type: ${n.type} | Content: ${n.content}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
