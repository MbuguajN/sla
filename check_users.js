const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.user.findMany({
    select: { id: true, name: true, email: true, role: true, password: true }
}).then(u => {
    console.log(JSON.stringify(u, null, 2));
}).catch(e => {
    console.error('ERROR:', e.message);
}).finally(() => p.$disconnect());
