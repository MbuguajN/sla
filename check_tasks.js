const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tasks = await prisma.task.findMany({
            include: {
                reporter: true,
                department: true,
                assignee: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        console.log('Recent Tasks:');
        tasks.forEach(t => {
            console.log(`[${t.createdAt.toISOString()}] ID: ${t.id} | Title: ${t.title} | Reporter: ${t.reporter?.email} (${t.reporter?.role}) | Dept: ${t.department?.name}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
