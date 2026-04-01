// Cleanup script to delete all requisitions and refunds
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function cleanup() {
  try {
    // Delete all requisition items first (foreign key)
    await db.requisitionItem.deleteMany({});
    console.log("✓ Deleted all requisition items");

    // Delete all requisitions
    await db.requisition.deleteMany({});
    console.log("✓ Deleted all requisitions");

    // Delete all refunds
    await db.refund.deleteMany({});
    console.log("✓ Deleted all refunds");

    console.log("\n✓ Cleanup complete!");
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

cleanup();
