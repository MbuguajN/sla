const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const notifications = await prisma.notification.findMany({
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        console.log('Recent Notifications (All Users):');
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
