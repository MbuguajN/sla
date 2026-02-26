const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tasks = await prisma.task.findMany({
            include: {
                reporter: true,
                assignee: true
                // department is not a relation, it's just departmentId
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        console.log('Recent Tasks:');
        tasks.forEach(t => {
            console.log(`[${t.createdAt.toISOString()}] ID: ${t.id} | Title: ${t.title} | Reporter: ${t.reporter?.email} (${t.reporter?.role}) | DeptID: ${t.departmentId}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
