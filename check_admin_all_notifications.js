const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: 1 },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`Total Admin Notifications: ${notifications.length}`);
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
