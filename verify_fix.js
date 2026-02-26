const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const techDept = await prisma.department.findUnique({ where: { name: 'TECHNOLOGY' } });
        if (!techDept) throw new Error('TECHNOLOGY department not found');

        console.log('--- Testing notifyDepartmentHead for TECHNOLOGY ---');
        // We'll import the business logic indirectly by just checking what the DB currently shows for managers
        const managers = await prisma.user.findMany({
            where: { departmentId: techDept.id, role: 'MANAGER' }
        });
        console.log(`Found ${managers.length} managers in TECHNOLOGY:`, managers.map(m => m.email));

        // Wait, I should actually test the function. I'll create a standalone test that mimics the logic since I can't easily import TS into this node script without setup.
        // Logic from lib/notifications.ts:
        const dept = await prisma.department.findUnique({
            where: { id: techDept.id },
            select: { headId: true, name: true, head: { select: { role: true } } }
        });

        const otherManagers = await prisma.user.findMany({
            where: {
                departmentId: techDept.id,
                role: 'MANAGER',
                NOT: { id: dept.headId || undefined }
            }
        });

        const recipients = new Set();
        if (dept.headId && dept.head.role !== 'ADMIN' && dept.head.role !== 'SYSTEM') {
            recipients.add(dept.headId);
        }
        otherManagers.forEach(m => recipients.add(m.id));

        console.log('Simulated Recipients:', Array.from(recipients));

        if (recipients.has(6)) { // Chris is 6
            console.log('✅ Chris is included in recipients.');
        } else {
            console.error('❌ Chris is NOT included in recipients.');
        }

        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (admin && recipients.has(admin.id)) {
            console.error('❌ Admin is incorrectly included in recipients.');
        } else {
            console.log('✅ Admin is correctly excluded from recipients.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
