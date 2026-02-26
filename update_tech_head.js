const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const techDept = await prisma.department.findUnique({ where: { name: 'TECHNOLOGY' } });
        const chris = await prisma.user.findUnique({ where: { email: 'chris@5dm.africa' } });

        if (techDept && chris) {
            await prisma.department.update({
                where: { id: techDept.id },
                data: { headId: chris.id }
            });
            console.log(`✅ Successfully updated TECHNOLOGY department head to Chris (ID: ${chris.id})`);
        } else {
            console.error('❌ Could not find TECHNOLOGY department or Chris user');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
