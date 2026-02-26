const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const notifications = await prisma.notification.findMany({
            where: {
                createdAt: { gte: today }
            },
            include: { user: true },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`Notifications created since ${today.toISOString()}: ${notifications.length}`);
        notifications.forEach(n => {
            console.log(`[${n.createdAt.toISOString()}] To: ${n.user.email} (${n.user.role}) | Type: ${n.type} | Content: ${n.content}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
