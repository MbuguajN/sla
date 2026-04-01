const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function run() {
  const items = await db.requisitionItem.deleteMany({});
  const reqs = await db.requisition.deleteMany({});
  const refunds = await db.refund.deleteMany({});
  const notifs = await db.notification.deleteMany({
    where: { type: { in: ['REQUISITION_APPROVED','REQUISITION_DENIED','REQUISITION_UPDATED'] } }
  });
  console.log('Deleted:', { items: items.count, requisitions: reqs.count, refunds: refunds.count, notifications: notifs.count });
  await db.$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
