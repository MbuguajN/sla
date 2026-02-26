const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tasks = await prisma.task.findMany({
            where: {
                createdAt: { gte: today }
            },
            include: {
                reporter: true,
                assignee: true
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`Tasks created since ${today.toISOString()}: ${tasks.length}`);
        tasks.forEach(t => {
            console.log(`[${t.createdAt.toISOString()}] ID: ${t.id} | Title: ${t.title} | Reporter: ${t.reporter?.email} (${t.reporter?.role}) | DeptID: ${t.departmentId} | Assignee: ${t.assignee?.email || 'NONE'}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
