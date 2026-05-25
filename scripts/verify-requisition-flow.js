const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

function initialStatusForRole(role, hasDepartment) {
  if (role === "CEO" || role === "ADMIN") return "PENDING_FINANCE";
  if (role === "MANAGER") return "PENDING_CEO";
  return hasDepartment ? "PENDING_MANAGER" : "PENDING_CEO";
}

async function main() {
  const matrix = [
    { role: "EMPLOYEE", hasDepartment: true },
    { role: "EMPLOYEE", hasDepartment: false },
    { role: "MANAGER", hasDepartment: true },
    { role: "CEO", hasDepartment: false },
    { role: "ADMIN", hasDepartment: false },
  ];

  console.log("Submission Matrix");
  for (const row of matrix) {
    console.log(`${row.role} (dept:${row.hasDepartment}) -> ${initialStatusForRole(row.role, row.hasDepartment)}`);
  }

  console.log("\nStage Flow");
  console.log("PENDING_MANAGER -> PENDING_CEO -> PENDING_FINANCE -> APPROVED");

  const users = await db.user.findMany({
    where: {
      email: {
        in: [
          "admin@5dm.africa",
          "ceo@5dm.africa",
          "bd.manager@5dm.africa",
          "developer@5dm.africa",
        ],
      },
    },
    select: {
      email: true,
      role: true,
      departmentId: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  console.log("\nSeed Role Check");
  for (const user of users) {
    console.log(`${user.email} -> role:${user.role}, dept:${user.departmentId ?? "null"}`);
  }

  const byStatus = await db.requisition.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  console.log("\nRequisition Status Counts");
  for (const row of byStatus) {
    console.log(`${row.status}: ${row._count._all}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
