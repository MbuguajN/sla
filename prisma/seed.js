const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

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

  const setupCompleteAt = new Date();

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@5dm.africa" },
    update: { isActive: true, passwordSetupRequired: false, firstLoginAt: setupCompleteAt },
    create: {
      email: "admin@5dm.africa",
      password: hashedPassword,
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
      passwordSetupRequired: false,
      firstLoginAt: setupCompleteAt,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create CEO
  const ceo = await prisma.user.upsert({
    where: { email: "ceo@5dm.africa" },
    update: { isActive: true, passwordSetupRequired: false, firstLoginAt: setupCompleteAt },
    create: {
      email: "ceo@5dm.africa",
      password: hashedPassword,
      name: "John CEO",
      role: "CEO",
      isActive: true,
      passwordSetupRequired: false,
      firstLoginAt: setupCompleteAt,
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
      where: { email: "tech.manager@5dm.africa" },
      update: { isActive: true, passwordSetupRequired: false, firstLoginAt: setupCompleteAt },
      create: {
        email: "tech.manager@5dm.africa",
        password: hashedPassword,
        name: "Tech Manager",
        role: "MANAGER",
        departmentId: techDept.id,
        isActive: true,
        passwordSetupRequired: false,
        firstLoginAt: setupCompleteAt,
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
      where: { email: "bd.manager@5dm.africa" },
      update: { isActive: true, passwordSetupRequired: false, firstLoginAt: setupCompleteAt },
      create: {
        email: "bd.manager@5dm.africa",
        password: hashedPassword,
        name: "BD Manager",
        role: "MANAGER",
        departmentId: bdDept.id,
        isActive: true,
        passwordSetupRequired: false,
        firstLoginAt: setupCompleteAt,
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
      where: { email: "finance.manager@5dm.africa" },
      update: { isActive: true, passwordSetupRequired: false, firstLoginAt: setupCompleteAt },
      create: {
        email: "finance.manager@5dm.africa",
        password: hashedPassword,
        name: "Finance Manager",
        role: "MANAGER",
        departmentId: financeDept.id,
        isActive: true,
        passwordSetupRequired: false,
        firstLoginAt: setupCompleteAt,
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
      where: { email: "hr.manager@5dm.africa" },
      update: { isActive: true, passwordSetupRequired: false, firstLoginAt: setupCompleteAt },
      create: {
        email: "hr.manager@5dm.africa",
        password: hashedPassword,
        name: "HR Manager",
        role: "MANAGER",
        departmentId: hrDept.id,
        isActive: true,
        passwordSetupRequired: false,
        firstLoginAt: setupCompleteAt,
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
      where: { email: "cs.manager@5dm.africa" },
      update: { isActive: true, passwordSetupRequired: false, firstLoginAt: setupCompleteAt },
      create: {
        email: "cs.manager@5dm.africa",
        password: hashedPassword,
        name: "Client Service Manager",
        role: "MANAGER",
        departmentId: csDept.id,
        isActive: true,
        passwordSetupRequired: false,
        firstLoginAt: setupCompleteAt,
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
      where: { email: "developer@5dm.africa" },
      update: { isActive: true, passwordSetupRequired: false, firstLoginAt: setupCompleteAt },
      create: {
        email: "developer@5dm.africa",
        password: hashedPassword,
        name: "John Developer",
        role: "EMPLOYEE",
        departmentId: techDept.id,
        isActive: true,
        passwordSetupRequired: false,
        firstLoginAt: setupCompleteAt,
      },
    });
    console.log("Created employee: developer@5dm.africa");
  }

  if (bdDept) {
    await prisma.user.upsert({
      where: { email: "bd.exec@5dm.africa" },
      update: { isActive: true, passwordSetupRequired: false, firstLoginAt: setupCompleteAt },
      create: {
        email: "bd.exec@5dm.africa",
        password: hashedPassword,
        name: "BD Executive",
        role: "EMPLOYEE",
        departmentId: bdDept.id,
        isActive: true,
        passwordSetupRequired: false,
        firstLoginAt: setupCompleteAt,
      },
    });
    console.log("Created employee: bd.exec@5dm.africa");
  }

  // Create invite-pending user to test onboarding flow
  const inviteUser = await prisma.user.upsert({
    where: { email: "new.user@5dm.africa" },
    update: {
      passwordSetupRequired: true,
      firstLoginAt: null,
    },
    create: {
      email: "new.user@5dm.africa",
      password: hashedPassword,
      name: "New User Invite",
      role: "EMPLOYEE",
      departmentId: bdDept?.id || null,
      isActive: true,
      passwordSetupRequired: true,
      firstLoginAt: null,
    },
  });

  const inviteTokenPlain = crypto.randomBytes(32).toString("hex");
  const inviteTokenHash = crypto.createHash("sha256").update(inviteTokenPlain).digest("hex");

  await prisma.userInviteToken.upsert({
    where: { userId: inviteUser.id },
    update: {
      email: inviteUser.email,
      token: inviteTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      usedAt: null,
    },
    create: {
      userId: inviteUser.id,
      email: inviteUser.email,
      token: inviteTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      usedAt: null,
    },
  });

  console.log(`Created invite-pending user: ${inviteUser.email}`);
  console.log(`Invite link: https://ops.5dm.africa/change-password?invite=${inviteTokenPlain}`);

  console.log("\nSeeding complete!");
  console.log("\nTest accounts (password for all: admin123):");
  console.log("- admin@5dm.africa (Admin, normal login)");
  console.log("- ceo@5dm.africa (CEO, normal login)");
  console.log("- tech.manager@5dm.africa (Tech Manager, normal login)");
  console.log("- bd.manager@5dm.africa (BD Manager, normal login)");
  console.log("- finance.manager@5dm.africa (Finance Manager, normal login)");
  console.log("- hr.manager@5dm.africa (HR Manager, normal login)");
  console.log("- cs.manager@5dm.africa (Client Service Manager, normal login)");
  console.log("- developer@5dm.africa (Employee - Tech, normal login)");
  console.log("- bd.exec@5dm.africa (Employee - BD, normal login)");
  console.log("- new.user@5dm.africa (Invite-pending user, must use invite link)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
