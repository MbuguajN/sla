const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create departments
  const departments = [
    { name: "Creative", slug: "creative" },
    { name: "Content", slug: "content" },
    { name: "Technology", slug: "technology" },
    { name: "Media", slug: "media" },
    { name: "Business Development", slug: "business-development" },
    { name: "Finance", slug: "finance" },
    { name: "Client Service", slug: "client-service" },
    { name: "General Staff", slug: "general-staff" },
    { name: "Human Resources", slug: "human-resources" },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { slug: dept.slug },
      update: {},
      create: dept,
    });
    console.log(`Created department: ${dept.name}`);
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      password: hashedPassword,
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create CEO
  const ceo = await prisma.user.upsert({
    where: { email: "ceo@company.com" },
    update: {},
    create: {
      email: "ceo@company.com",
      password: hashedPassword,
      name: "John CEO",
      role: "CEO",
      isActive: true,
    },
  });
  console.log(`Created CEO user: ${ceo.email}`);

  // Create department managers
  const techDept = await prisma.department.findUnique({ where: { slug: "technology" } });
  const bdDept = await prisma.department.findUnique({ where: { slug: "business-development" } });
  const financeDept = await prisma.department.findUnique({ where: { slug: "finance" } });
  const hrDept = await prisma.department.findUnique({ where: { slug: "human-resources" } });
  const csDept = await prisma.department.findUnique({ where: { slug: "client-service" } });

  if (techDept) {
    const techManager = await prisma.user.upsert({
      where: { email: "tech.manager@company.com" },
      update: {},
      create: {
        email: "tech.manager@company.com",
        password: hashedPassword,
        name: "Tech Manager",
        role: "MANAGER",
        departmentId: techDept.id,
        isActive: true,
      },
    });
    await prisma.department.update({
      where: { id: techDept.id },
      data: { headId: techManager.id },
    });
    console.log(`Created tech manager: ${techManager.email}`);
  }

  if (bdDept) {
    const bdManager = await prisma.user.upsert({
      where: { email: "bd.manager@company.com" },
      update: {},
      create: {
        email: "bd.manager@company.com",
        password: hashedPassword,
        name: "BD Manager",
        role: "MANAGER",
        departmentId: bdDept.id,
        isActive: true,
      },
    });
    await prisma.department.update({
      where: { id: bdDept.id },
      data: { headId: bdManager.id },
    });
    console.log(`Created BD manager: ${bdManager.email}`);
  }

  if (financeDept) {
    const financeManager = await prisma.user.upsert({
      where: { email: "finance.manager@company.com" },
      update: {},
      create: {
        email: "finance.manager@company.com",
        password: hashedPassword,
        name: "Finance Manager",
        role: "MANAGER",
        departmentId: financeDept.id,
        isActive: true,
      },
    });
    await prisma.department.update({
      where: { id: financeDept.id },
      data: { headId: financeManager.id },
    });
    console.log(`Created finance manager: ${financeManager.email}`);
  }

  if (hrDept) {
    const hrManager = await prisma.user.upsert({
      where: { email: "hr.manager@company.com" },
      update: {},
      create: {
        email: "hr.manager@company.com",
        password: hashedPassword,
        name: "HR Manager",
        role: "MANAGER",
        departmentId: hrDept.id,
        isActive: true,
      },
    });
    await prisma.department.update({
      where: { id: hrDept.id },
      data: { headId: hrManager.id },
    });
    console.log(`Created HR manager: ${hrManager.email}`);
  }

  if (csDept) {
    const csManager = await prisma.user.upsert({
      where: { email: "cs.manager@company.com" },
      update: {},
      create: {
        email: "cs.manager@company.com",
        password: hashedPassword,
        name: "Client Service Manager",
        role: "MANAGER",
        departmentId: csDept.id,
        isActive: true,
      },
    });
    await prisma.department.update({
      where: { id: csDept.id },
      data: { headId: csManager.id },
    });
    console.log(`Created CS manager: ${csManager.email}`);
  }

  // Create a few employees
  if (techDept) {
    await prisma.user.upsert({
      where: { email: "developer@company.com" },
      update: {},
      create: {
        email: "developer@company.com",
        password: hashedPassword,
        name: "John Developer",
        role: "EMPLOYEE",
        departmentId: techDept.id,
        isActive: true,
      },
    });
    console.log("Created employee: developer@company.com");
  }

  if (bdDept) {
    await prisma.user.upsert({
      where: { email: "bd.exec@company.com" },
      update: {},
      create: {
        email: "bd.exec@company.com",
        password: hashedPassword,
        name: "BD Executive",
        role: "EMPLOYEE",
        departmentId: bdDept.id,
        isActive: true,
      },
    });
    console.log("Created employee: bd.exec@company.com");
  }

  console.log("\nSeeding complete!");
  console.log("\nTest accounts (password for all: admin123):");
  console.log("- admin@company.com (Admin)");
  console.log("- ceo@company.com (CEO)");
  console.log("- tech.manager@company.com (Tech Manager)");
  console.log("- bd.manager@company.com (BD Manager)");
  console.log("- finance.manager@company.com (Finance Manager)");
  console.log("- hr.manager@company.com (HR Manager)");
  console.log("- cs.manager@company.com (Client Service Manager)");
  console.log("- developer@company.com (Employee - Tech)");
  console.log("- bd.exec@company.com (Employee - BD)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
