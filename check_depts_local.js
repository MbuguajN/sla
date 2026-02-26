const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const depts = await prisma.department.findMany({
            include: { head: true }
        });
        depts.forEach(d => {
            console.log(`Dept: ${d.name} | Head ID: ${d.headId} | Head Email: ${d.head?.email || 'NONE'} | Role: ${d.head?.role || 'N/A'}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
