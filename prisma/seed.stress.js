const { PrismaClient, Prisma } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEPARTMENTS = [
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

const LEAVE_TYPES = [
  "LEAVE_FULL_DAY",
  "LEAVE_MORNING",
  "LEAVE_AFTERNOON",
  "SICKNESS_LEAVE_FULL_DAY",
  "SICKNESS_LEAVE_MORNING",
  "SICKNESS_LEAVE_AFTERNOON",
  "MATERNITY",
  "PATERNITY",
  "COMPASSIONATE_LEAVE",
  "TOIL",
  "WORK_FROM_HOME",
];

const ROLES = ["ADMIN", "CEO", "MANAGER", "EMPLOYEE"];

const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "TASK_CONFIRMED",
  "TASK_COMPLETED",
  "LEAVE_APPROVED",
  "LEAVE_DENIED",
  "REQUISITION_SUBMITTED",
  "REQUISITION_APPROVED",
  "REQUISITION_DENIED",
  "REQUISITION_UPDATED",
  "REFUND_SUBMITTED",
  "REFUND_APPROVED",
  "REFUND_DENIED",
  "IT_TICKET_ASSIGNED",
  "IT_TICKET_RESOLVED",
];

const TASK_STATUSES = ["ASSIGNED", "CONFIRMED", "IN_PROGRESS", "PAUSED", "SUBMITTED", "REVISION", "DONE"];
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const ACTIVITY_TYPES = ["CREATED", "ASSIGNED", "CONFIRMED", "STATUS_CHANGED", "SUBMITTED", "RESUMED", "PAUSED", "COMPLETED"];
const SUGGESTION_CATEGORIES = ["COMPLAINT", "SUGGESTION", "FEEDBACK", "REQUEST"];
const SUGGESTION_STATUSES = ["OPEN", "IN_REVIEW", "ACTIONED", "CLOSED"];
const REQUISITION_STATUSES = ["PENDING_FINANCE", "PENDING_CEO", "APPROVED", "DENIED"];
const REFUND_STATUSES = ["PENDING_FINANCE", "PENDING_CEO", "APPROVED", "DENIED"];
const IT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const IT_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const EQUIPMENT_STATUSES = ["IN_USE", "NOT_IN_USE", "MAINTENANCE", "RETIRED"];
const LEAVE_STATUSES = ["PENDING", "APPROVED", "DENIED", "CANCELLED"];

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

function maybe(probability) {
  return Math.random() < probability;
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

function randomDateWithinDays(daysBack) {
  const now = Date.now();
  const min = now - daysBack * 24 * 60 * 60 * 1000;
  return new Date(randomInt(min, now));
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function weightedTaskStatus() {
  const r = Math.random();
  if (r < 0.35) return "DONE";
  if (r < 0.55) return "IN_PROGRESS";
  if (r < 0.65) return "SUBMITTED";
  if (r < 0.75) return "ASSIGNED";
  if (r < 0.82) return "CONFIRMED";
  if (r < 0.9) return "REVISION";
  return "PAUSED";
}

async function createManyInChunks(modelName, rows, chunkSize = 1000) {
  if (!rows.length) return;
  for (const rowsChunk of chunk(rows, chunkSize)) {
    await prisma[modelName].createMany({
      data: rowsChunk,
      skipDuplicates: true,
    });
  }
}

async function ensureDepartments() {
  for (const dept of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { slug: dept.slug },
      update: { name: dept.name },
      create: dept,
    });
  }

  return prisma.department.findMany({ orderBy: { id: "asc" } });
}

async function ensureCoreUsers(passwordHash) {
  await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: { isActive: true },
    create: {
      email: "admin@company.com",
      password: passwordHash,
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "ceo@company.com" },
    update: { isActive: true },
    create: {
      email: "ceo@company.com",
      password: passwordHash,
      name: "Chief Executive Officer",
      role: "CEO",
      isActive: true,
    },
  });
}

async function resolveLeaveTypesForEnvironment() {
  const prismaLeaveTypes = Object.values(Prisma.LeaveType || {});

  try {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'LeaveType' ORDER BY e.enumsortorder"
    );

    const enumValues = rows
      .map((row) => row.enumlabel)
      .filter((value) => typeof value === "string" && value.length > 0);

    if (enumValues.length > 0) {
      const overlap = enumValues.filter((value) => prismaLeaveTypes.includes(value));
      if (overlap.length > 0) {
        return overlap;
      }

      console.warn("No overlapping LeaveType values between Prisma client and DB enum; skipping leave seeding.");
      return [];
    }
  } catch (error) {
    console.warn("Could not introspect LeaveType enum values from DB; falling back to defaults.");
  }

  return LEAVE_TYPES.filter((value) => prismaLeaveTypes.includes(value));
}

async function main() {
  const runTag = process.env.STRESS_TAG || new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const config = {
    users: envInt("STRESS_USERS", 300),
    clients: envInt("STRESS_CLIENTS", 80),
    projects: envInt("STRESS_PROJECTS", 220),
    tasks: envInt("STRESS_TASKS", 5000),
    dailyLogs: envInt("STRESS_DAILY_LOGS", 7000),
    genericActivityLogs: envInt("STRESS_ACTIVITY_LOGS", 12000),
    leaves: envInt("STRESS_LEAVES", 1400),
    suggestions: envInt("STRESS_SUGGESTIONS", 800),
    requisitions: envInt("STRESS_REQUISITIONS", 700),
    refunds: envInt("STRESS_REFUNDS", 900),
    itTickets: envInt("STRESS_IT_TICKETS", 1200),
    notifications: envInt("STRESS_NOTIFICATIONS", 9000),
    loginAttempts: envInt("STRESS_LOGIN_ATTEMPTS", 12000),
    equipmentItems: envInt("STRESS_EQUIPMENT_ITEMS", 1000),
    handovers: envInt("STRESS_HANDOVERS", 300),
  };

  const password = process.env.STRESS_PASSWORD || "admin123";
  const hashRounds = envInt("STRESS_HASH_ROUNDS", 10);
  const passwordHash = await bcrypt.hash(password, hashRounds);
  const leaveTypesForDb = await resolveLeaveTypesForEnvironment();

  console.log("\n=== Stress Seed Start ===");
  console.log(`Run tag: ${runTag}`);
  console.log("Config:", config);
  console.log("LeaveType enum values used:", leaveTypesForDb);

  const departments = await ensureDepartments();
  await ensureCoreUsers(passwordHash);

  const managerRows = departments.map((dept, index) => ({
    email: `${runTag}.manager.${index + 1}@stress.local`,
    password: passwordHash,
    name: `Stress Manager ${index + 1}`,
    role: "MANAGER",
    departmentId: dept.id,
    isActive: true,
  }));

  const employeeRows = Array.from({ length: config.users }).map((_, index) => {
    const dept = pick(departments);
    return {
      email: `${runTag}.employee.${index + 1}@stress.local`,
      password: passwordHash,
      name: `Stress Employee ${index + 1}`,
      role: "EMPLOYEE",
      departmentId: dept.id,
      isActive: true,
    };
  });

  await createManyInChunks("user", [...managerRows, ...employeeRows]);

  const stressUsers = await prisma.user.findMany({
    where: { email: { startsWith: `${runTag}.` } },
    select: { id: true, email: true, name: true, role: true, departmentId: true },
  });

  const managers = stressUsers.filter((u) => u.role === "MANAGER");
  const employees = stressUsers.filter((u) => u.role === "EMPLOYEE");

  for (const dept of departments) {
    const manager = managers.find((m) => m.departmentId === dept.id);
    if (!manager) continue;
    await prisma.department.update({
      where: { id: dept.id },
      data: { headId: manager.id },
    });
  }

  const leavePolicyRows = [];
  if (leaveTypesForDb.length > 0) {
    for (const role of ROLES) {
      for (const leaveType of leaveTypesForDb) {
        leavePolicyRows.push({
          role,
          leaveType,
          daysAllowed: leaveType.includes("SICKNESS") ? 12 : leaveType.includes("LEAVE") ? 24 : 8,
        });
      }
    }
  }
  await createManyInChunks("leavePolicy", leavePolicyRows);

  const clientRows = Array.from({ length: config.clients }).map((_, index) => ({
    name: `Stress ${runTag} Client ${index + 1}`,
    contactName: `Contact ${index + 1}`,
    email: `${runTag}.client.${index + 1}@stress.local`,
    phone: `+234800${String(index + 1).padStart(7, "0")}`,
    description: `Synthetic client for load test batch ${runTag}`,
    status: maybe(0.88) ? "ACTIVE" : "CLOSED",
    createdBy: pick(managers)?.id || null,
  }));
  await createManyInChunks("client", clientRows);

  const stressClients = await prisma.client.findMany({
    where: { name: { startsWith: `Stress ${runTag}` } },
    select: { id: true },
  });

  const creatorPool = [...managers, ...employees.slice(0, Math.min(50, employees.length))];

  const projectRows = Array.from({ length: config.projects }).map((_, index) => ({
    clientId: pick(stressClients).id,
    title: `Stress ${runTag} Project ${index + 1}`,
    description: `Synthetic project ${index + 1} for stress validation`,
    briefLink: maybe(0.55) ? `https://docs.example.com/stress/${runTag}/project-${index + 1}` : null,
    status: maybe(0.75) ? "ACTIVE" : pick(["ON_HOLD", "COMPLETED", "CANCELLED"]),
    createdBy: pick(creatorPool)?.id || null,
  }));
  await createManyInChunks("project", projectRows);

  const stressProjects = await prisma.project.findMany({
    where: { title: { startsWith: `Stress ${runTag} Project` } },
    select: { id: true, createdBy: true },
  });

  const projectDepartmentRows = [];
  const seenProjectDept = new Set();
  for (const project of stressProjects) {
    const deptCount = randomInt(1, Math.min(3, departments.length));
    const localPicked = new Set();
    for (let i = 0; i < deptCount; i += 1) {
      const dept = pick(departments);
      if (localPicked.has(dept.id)) continue;
      localPicked.add(dept.id);
      const key = `${project.id}-${dept.id}`;
      if (seenProjectDept.has(key)) continue;
      seenProjectDept.add(key);
      projectDepartmentRows.push({
        projectId: project.id,
        departmentId: dept.id,
        slaHours: pick([12, 24, 36, 48, 72]),
      });
    }
  }
  await createManyInChunks("projectDepartment", projectDepartmentRows);

  const taskRows = Array.from({ length: config.tasks }).map((_, index) => {
    const project = pick(stressProjects);
    const assignee = pick(employees);
    const createdBy = pick(creatorPool) || assignee;
    const status = weightedTaskStatus();

    const createdAt = randomDateWithinDays(180);
    const briefReceivedAt = addHours(createdAt, randomInt(0, 6));
    const startedAt = addHours(briefReceivedAt, randomInt(1, 48));
    const submittedAt = addHours(startedAt, randomInt(1, 72));
    const completedAt = addHours(submittedAt, randomInt(1, 48));

    return {
      projectId: project.id,
      title: `Stress ${runTag} Task ${index + 1}`,
      description: `Synthetic task ${index + 1} generated for stress testing flows`,
      status,
      priority: pick(TASK_PRIORITIES),
      deptId: assignee.departmentId,
      assignedUserId: assignee.id,
      createdById: createdBy.id,
      slaHours: pick([12, 24, 36, 48, 72]),
      briefReceivedAt,
      briefCategory: maybe(0.5) ? "SAFE" : "SAT",
      slaStartedAt: startedAt,
      startedAt,
      slaPausedAt: status === "PAUSED" ? addHours(startedAt, randomInt(1, 10)) : null,
      slaPausedDuration: status === "PAUSED" ? randomInt(300, 7200) : 0,
      confirmedAt: ["CONFIRMED", "IN_PROGRESS", "SUBMITTED", "REVISION", "DONE", "PAUSED"].includes(status)
        ? addHours(startedAt, 1)
        : null,
      submittedAt: ["SUBMITTED", "REVISION", "DONE"].includes(status) ? submittedAt : null,
      completedAt: status === "DONE" ? completedAt : null,
      createdAt,
      updatedAt: status === "DONE" ? completedAt : addHours(createdAt, randomInt(2, 120)),
    };
  });
  await createManyInChunks("task", taskRows);

  const stressTasks = await prisma.task.findMany({
    where: { title: { startsWith: `Stress ${runTag} Task` } },
    select: { id: true, title: true, status: true, projectId: true, assignedUserId: true, createdById: true, completedAt: true },
  });

  const subtaskRows = [];
  for (const task of stressTasks) {
    if (!maybe(0.7)) continue;
    const count = randomInt(1, 4);
    for (let i = 0; i < count; i += 1) {
      subtaskRows.push({
        taskId: task.id,
        title: `Subtask ${i + 1} for ${task.title}`,
        description: maybe(0.5) ? "Synthetic subtask detail" : null,
        status: task.status === "DONE" ? "DONE" : pick(["PENDING", "IN_PROGRESS"]),
      });
    }
  }
  await createManyInChunks("subtask", subtaskRows);

  const taskLinkRows = [];
  for (const task of stressTasks) {
    if (!maybe(0.45)) continue;
    const count = randomInt(1, 2);
    for (let i = 0; i < count; i += 1) {
      taskLinkRows.push({
        taskId: task.id,
        name: `Link ${i + 1}`,
        url: `https://example.com/stress/${runTag}/task/${task.id}/link/${i + 1}`,
      });
    }
  }
  await createManyInChunks("taskLink", taskLinkRows);

  const genericActivityRows = Array.from({ length: config.genericActivityLogs }).map((_, index) => {
    const task = pick(stressTasks);
    const type = pick(ACTIVITY_TYPES);
    return {
      type,
      description: `Stress activity ${index + 1} (${type.toLowerCase()})`,
      taskId: task.id,
      projectId: task.projectId,
      userId: task.assignedUserId || task.createdById,
      metadata: JSON.stringify({ runTag, synthetic: true, index }),
      isHiddenFromDashboard: maybe(0.08),
      createdAt: randomDateWithinDays(180),
    };
  });
  await createManyInChunks("activityLog", genericActivityRows);

  const dailyLogRows = Array.from({ length: config.dailyLogs }).map((_, index) => {
    const task = pick(stressTasks);
    const markCompleted = maybe(0.4);
    return {
      type: "COMMENTED",
      description: markCompleted ? "logged daily progress (completed)" : "logged daily progress",
      taskId: task.id,
      projectId: task.projectId,
      userId: task.assignedUserId || task.createdById,
      metadata: JSON.stringify({
        kind: "DAILY_LOG",
        note: `Synthetic daily log note ${index + 1} for stress run ${runTag}`,
        markCompleted,
        projectTitle: `Project ${task.projectId}`,
        taskTitle: task.title,
      }),
      isHiddenFromDashboard: false,
      createdAt: randomDateWithinDays(120),
    };
  });
  await createManyInChunks("activityLog", dailyLogRows);

  const leaveRows = leaveTypesForDb.length
    ? Array.from({ length: config.leaves }).map((_, index) => {
        const user = pick(employees);
        const type = pick(leaveTypesForDb);
        const status = pick(LEAVE_STATUSES);
        const startDate = randomDateWithinDays(160);
        const endDate = addDays(startDate, type.endsWith("MORNING") || type.endsWith("AFTERNOON") ? 0 : randomInt(0, 5));
        return {
          userId: user.id,
          type,
          startDate,
          endDate,
          totalDays: type.endsWith("MORNING") || type.endsWith("AFTERNOON") ? 0.5 : randomInt(1, 6),
          reason: `Stress leave request ${index + 1} (${runTag})`,
          status,
          reviewedBy: status === "PENDING" ? null : pick(managers)?.id || null,
          reviewNote: status === "PENDING" ? null : `Synthetic review for leave ${index + 1}`,
          createdAt: randomDateWithinDays(180),
        };
      })
    : [];
  await createManyInChunks("leave", leaveRows);

  const generatedLeaves = await prisma.leave.findMany({
    where: { reason: { startsWith: "Stress leave request" } },
    select: { id: true, userId: true, status: true },
    orderBy: { id: "desc" },
    take: config.leaves,
  });

  const tasksByUser = new Map();
  for (const task of stressTasks) {
    if (!task.assignedUserId) continue;
    const current = tasksByUser.get(task.assignedUserId) || [];
    current.push(task);
    tasksByUser.set(task.assignedUserId, current);
  }

  const handoverRows = [];
  for (const leave of generatedLeaves) {
    if (handoverRows.length >= config.handovers) break;
    if (leave.status !== "APPROVED") continue;
    const candidateTasks = tasksByUser.get(leave.userId) || [];
    if (!candidateTasks.length) continue;
    const task = pick(candidateTasks);
    const delegate = pick(employees.filter((u) => u.id !== leave.userId));
    if (!delegate) continue;

    handoverRows.push({
      leaveId: leave.id,
      taskId: task.id,
      originalAssigneeId: leave.userId,
      delegateUserId: delegate.id,
      status: pick(["PENDING_TRANSFER", "TRANSFERRED", "RETURNED"]),
      transferredAt: maybe(0.7) ? randomDateWithinDays(60) : null,
      returnedAt: maybe(0.25) ? randomDateWithinDays(30) : null,
    });
  }
  await createManyInChunks("leaveTaskHandover", handoverRows);

  const holidayRows = [];
  const currentYear = new Date().getFullYear();
  for (let month = 0; month < 12; month += 1) {
    holidayRows.push({
      name: `Stress Holiday ${runTag}-${month + 1}`,
      date: new Date(currentYear, month, randomInt(1, 24)),
    });
  }
  await createManyInChunks("publicHoliday", holidayRows);

  const suggestionRows = Array.from({ length: config.suggestions }).map((_, index) => ({
    userId: pick(employees).id,
    title: `Stress Suggestion ${index + 1}`,
    content: `Synthetic suggestion content for run ${runTag}, item ${index + 1}`,
    category: pick(SUGGESTION_CATEGORIES),
    isAnonymous: maybe(0.2),
    status: pick(SUGGESTION_STATUSES),
    hrNote: maybe(0.4) ? "Synthetic HR note" : null,
    createdAt: randomDateWithinDays(180),
  }));
  await createManyInChunks("suggestion", suggestionRows);

  const requisitionRows = Array.from({ length: config.requisitions }).map((_, index) => {
    const itemA = randomInt(1, 8) * randomInt(2000, 9000);
    const itemB = randomInt(1, 4) * randomInt(5000, 12000);
    return {
      userId: pick(employees).id,
      title: `Stress Requisition ${runTag} ${index + 1}`,
      reason: `Synthetic procurement request ${index + 1}`,
      totalAmount: itemA + itemB,
      status: pick(REQUISITION_STATUSES),
      managerNote: maybe(0.5) ? "Synthetic manager note" : null,
      financeNote: maybe(0.5) ? "Synthetic finance note" : null,
      ceoNote: maybe(0.4) ? "Synthetic CEO note" : null,
      createdAt: randomDateWithinDays(180),
    };
  });
  await createManyInChunks("requisition", requisitionRows);

  const generatedRequisitions = await prisma.requisition.findMany({
    where: { title: { startsWith: `Stress Requisition ${runTag}` } },
    select: { id: true },
  });

  const requisitionItemRows = [];
  for (const requisition of generatedRequisitions) {
    const itemCount = randomInt(1, 4);
    for (let i = 0; i < itemCount; i += 1) {
      requisitionItemRows.push({
        requisitionId: requisition.id,
        itemName: `Stress Item ${i + 1}`,
        quantity: randomInt(1, 10),
        unitPrice: randomInt(1000, 25000),
        vatInclusive: maybe(0.45),
      });
    }
  }
  await createManyInChunks("requisitionItem", requisitionItemRows);

  const refundRows = Array.from({ length: config.refunds }).map((_, index) => ({
    userId: pick(employees).id,
    amount: randomInt(2500, 350000),
    reason: `Stress refund claim ${index + 1} for run ${runTag}`,
    status: pick(REFUND_STATUSES),
    financeNote: maybe(0.45) ? "Synthetic finance review" : null,
    ceoNote: maybe(0.3) ? "Synthetic CEO review" : null,
    createdAt: randomDateWithinDays(180),
  }));
  await createManyInChunks("refund", refundRows);

  const itTicketRows = Array.from({ length: config.itTickets }).map((_, index) => {
    const creator = pick(employees);
    const assignee = maybe(0.75) ? pick(managers) : null;
    const status = pick(IT_STATUSES);
    const createdAt = randomDateWithinDays(180);
    return {
      userId: creator.id,
      title: `Stress IT Ticket ${index + 1}`,
      description: `Synthetic IT issue detail for stress run ${runTag}`,
      priority: pick(IT_PRIORITIES),
      status,
      assignedUserId: assignee ? assignee.id : null,
      resolvedAt: ["RESOLVED", "CLOSED"].includes(status) ? addHours(createdAt, randomInt(4, 144)) : null,
      createdAt,
      updatedAt: addHours(createdAt, randomInt(2, 120)),
    };
  });
  await createManyInChunks("iTTicket", itTicketRows);

  const equipmentCategoryNames = ["Laptop", "Desktop", "Monitor", "Phone", "Network", "Peripherals"];
  for (const name of equipmentCategoryNames) {
    await prisma.equipmentCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const categories = await prisma.equipmentCategory.findMany({ select: { id: true, name: true } });

  const equipmentRows = Array.from({ length: config.equipmentItems }).map((_, index) => {
    const owner = maybe(0.82) ? pick(employees) : null;
    return {
      categoryId: pick(categories).id,
      make: pick(["Dell", "HP", "Lenovo", "Apple", "Asus", "Acer"]),
      model: `Stress-${runTag}-${index + 1}`,
      ownerUserId: owner ? owner.id : null,
      ownerLabel: owner ? owner.name : "5DM",
      status: pick(EQUIPMENT_STATUSES),
      serialNumber: `SN-${runTag}-${String(index + 1).padStart(6, "0")}`,
      createdAt: randomDateWithinDays(365),
      updatedAt: randomDateWithinDays(180),
    };
  });
  await createManyInChunks("equipmentItem", equipmentRows);

  const viewerCandidates = employees.slice(0, Math.min(60, employees.length));
  const equipmentViewerRows = viewerCandidates.map((user) => ({
    userId: user.id,
    grantedById: pick(managers)?.id || null,
    createdAt: randomDateWithinDays(180),
  }));
  await createManyInChunks("equipmentViewer", equipmentViewerRows);

  const notificationRows = Array.from({ length: config.notifications }).map((_, index) => ({
    userId: pick(stressUsers).id,
    type: pick(NOTIFICATION_TYPES),
    title: `Stress Notification ${index + 1}`,
    message: `Synthetic notification payload ${index + 1} for run ${runTag}`,
    link: maybe(0.5) ? `/tasks/${pick(stressTasks).id}` : null,
    isRead: maybe(0.35),
    createdAt: randomDateWithinDays(120),
  }));
  await createManyInChunks("notification", notificationRows);

  const loginAttemptRows = Array.from({ length: config.loginAttempts }).map((_, index) => {
    const user = maybe(0.8) ? pick(stressUsers) : null;
    const status = maybe(0.72) ? "SUCCESS" : "FAILED";
    return {
      email: user ? user.email : `${runTag}.unknown.${index + 1}@stress.local`,
      userId: user ? user.id : null,
      status,
      ipAddress: `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`,
      location: pick(["Lagos", "Abuja", "London", "Nairobi", "Remote"]),
      userAgent: pick(["Chrome", "Firefox", "Safari", "Edge"]),
      failureReason: status === "FAILED" ? pick(["Wrong password", "Invalid user", "Account disabled"]) : null,
      createdAt: randomDateWithinDays(90),
    };
  });
  await createManyInChunks("loginAttempt", loginAttemptRows);

  console.log("\n=== Stress Seed Complete ===");
  console.log(`Run tag: ${runTag}`);
  console.log("Seeded counts:", {
    managers: managerRows.length,
    employees: employeeRows.length,
    clients: clientRows.length,
    projects: projectRows.length,
    tasks: taskRows.length,
    dailyLogs: dailyLogRows.length,
    genericActivityLogs: genericActivityRows.length,
    leaves: leaveRows.length,
    leaveHandovers: handoverRows.length,
    suggestions: suggestionRows.length,
    requisitions: requisitionRows.length,
    requisitionItems: requisitionItemRows.length,
    refunds: refundRows.length,
    itTickets: itTicketRows.length,
    equipmentItems: equipmentRows.length,
    notifications: notificationRows.length,
    loginAttempts: loginAttemptRows.length,
  });

  console.log("\nStress login users (all password from STRESS_PASSWORD or admin123):");
  console.log(`- ${runTag}.manager.1@stress.local`);
  console.log(`- ${runTag}.employee.1@stress.local`);
}

main()
  .catch((error) => {
    console.error("Stress seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
