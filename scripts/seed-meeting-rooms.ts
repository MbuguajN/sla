import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("=== Seeding Meeting Rooms ===\n");

  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.log("No admin user found. Skipping.");
    return;
  }

  const rooms = [
    { name: "Room 1", location: "Main Office" },
    { name: "Room 2", location: "Main Office" },
  ];

  for (const room of rooms) {
    const existing = await db.meetingRoom.findUnique({ where: { name: room.name } });
    if (!existing) {
      await db.meetingRoom.create({
        data: {
          name: room.name,
          location: room.location,
          createdBy: admin.id,
        },
      });
      console.log(`  Created room: ${room.name}`);
    } else {
      console.log(`  Room "${room.name}" already exists, skipping.`);
    }
  }

  console.log("\n=== Done ===");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
