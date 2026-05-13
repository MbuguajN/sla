const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, count) {
  const clone = [...arr];
  const out = [];
  while (clone.length && out.length < count) {
    const idx = Math.floor(Math.random() * clone.length);
    out.push(clone.splice(idx, 1)[0]);
  }
  return out;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const runTag = `TD-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 12)}`;

  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: { department: true },
    orderBy: { id: "asc" },
  });

  if (users.length < 4) {
    throw new Error("Need at least 4 active users before generating test data.");
  }

  const departments = await prisma.department.findMany({ orderBy: { id: "asc" } });
  const deptBySlug = new Map(departments.map((d) => [d.slug, d]));

  const admins = users.filter((u) => u.role === "ADMIN");
  const ceos = users.filter((u) => u.role === "CEO");
  const managers = users.filter((u) => u.role === "MANAGER");
  const employees = users.filter((u) => u.role === "EMPLOYEE");

  const businessUsers = users.filter((u) => u.department?.slug === "business-development");
  const clientServiceUsers = users.filter((u) => u.department?.slug === "client-service");
  const financeUsers = users.filter((u) => u.department?.slug === "finance");
  const techUsers = users.filter((u) => u.department?.slug === "technology");

  const creatorPool = [...businessUsers, ...clientServiceUsers, ...admins, ...managers];
  const assigneePool = [...employees, ...managers, ...users];

  const safeCreator = creatorPool[0] || users[0];
  const safeAssignee = assigneePool[0] || users[0];
  const safeFinance = financeUsers[0] || safeCreator;
  const safeTech = techUsers[0] || safeCreator;

  const clients = [];
  for (let i = 1; i <= 4; i += 1) {
    const client = await prisma.client.create({
      data: {
        name: `${runTag} Client ${i}`,
        contactName: `Contact ${i}`,
        email: `${runTag.toLowerCase()}-client-${i}@mail.test`,
        phone: `+23480${String(1000000 + i)}`,
        description: `Test data client ${i} (${runTag})`,
        status: "ACTIVE",
        createdBy: safeCreator.id,
      },
    });
    clients.push(client);
  }

  const projects = [];
  for (let i = 1; i <= 6; i += 1) {
    const creator = pick(creatorPool.length ? creatorPool : [safeCreator]);
    const client = pick(clients);
    const project = await prisma.project.create({
      data: {
        clientId: client.id,
        title: `${runTag} Project ${i}`,
        description: `Sample project ${i} generated for QA checks`,
        briefLink: `https://example.com/${runTag.toLowerCase()}/project-${i}`,
        status: i === 6 ? "ON_HOLD" : "ACTIVE",
        createdBy: creator.id,
      },
    });

    const candidateDepts = pickMany(departments, randomInt(2, Math.min(4, departments.length)));
    for (const dept of candidateDepts) {
      await prisma.projectDepartment.create({
        data: {
          projectId: project.id,
          departmentId: dept.id,
          slaHours: randomInt(24, 96),
        },
      });
    }

    projects.push(project);
  }

  const taskStatuses = [
    "ASSIGNED",
    "CONFIRMED",
    "IN_PROGRESS",
    "PAUSED",
    "SUBMITTED",
    "REVISION",
    "DONE",
  ];

  const activityRows = [];
  const tasks = [];
  for (let i = 1; i <= 36; i += 1) {
    const project = pick(projects);
    const assignee = pick(assigneePool.length ? assigneePool : [safeAssignee]);
    const creator = pick(creatorPool.length ? creatorPool : [safeCreator]);
    const status = taskStatuses[(i - 1) % taskStatuses.length];
    const createdAt = addDays(new Date(), -randomInt(0, 20));

    const startDate = ["IN_PROGRESS", "PAUSED", "SUBMITTED", "REVISION", "DONE"].includes(status)
      ? addHours(createdAt, randomInt(1, 12))
      : null;

    const completedAt = status === "DONE" ? addHours(startDate || createdAt, randomInt(4, 72)) : null;
    const submittedAt = ["SUBMITTED", "REVISION", "DONE"].includes(status)
      ? addHours(startDate || createdAt, randomInt(2, 48))
      : null;

    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        title: `${runTag} Task ${i}`,
        description: `Scenario task ${i} for module testing`,
        source: "STANDARD",
        status,
        priority: pick(["LOW", "MEDIUM", "HIGH", "URGENT"]),
        deptId: assignee.departmentId,
        assignedUserId: assignee.id,
        createdById: creator.id,
        slaHours: randomInt(12, 96),
        briefReceivedAt: createdAt,
        briefCategory: pick(["SAFE", "SAT"]),
        slaStartedAt: startDate,
        startedAt: startDate,
        confirmedAt: status !== "ASSIGNED" ? addHours(createdAt, 1) : null,
        submittedAt,
        completedAt,
      },
    });

    tasks.push(task);

    activityRows.push({
      type: "CREATED",
      description: "Task created",
      taskId: task.id,
      projectId: project.id,
      userId: creator.id,
    });

    activityRows.push({
      type: "STATUS_CHANGED",
      description: `Status moved to ${status}`,
      taskId: task.id,
      projectId: project.id,
      userId: assignee.id,
      metadata: JSON.stringify({ runTag, status }),
    });

    if (status === "DONE") {
      activityRows.push({
        type: "COMMENTED",
        description: "logged daily progress (completed)",
        taskId: task.id,
        projectId: project.id,
        userId: assignee.id,
        metadata: JSON.stringify({
          kind: "DAILY_LOG",
          note: `Completed ${task.title}`,
          markCompleted: true,
          taskTitle: task.title,
          projectTitle: projects.find((p) => p.id === project.id)?.title || "Unknown Project",
          source: "STANDARD",
        }),
      });
    }
  }

  if (activityRows.length > 0) {
    await prisma.activityLog.createMany({ data: activityRows });
  }

  const leaveUsers = pickMany(users, Math.min(6, users.length));
  for (const [index, u] of leaveUsers.entries()) {
    const start = addDays(new Date(), -randomInt(0, 30));
    const duration = randomInt(1, 3);
    await prisma.leave.create({
      data: {
        userId: u.id,
        type: "LEAVE_FULL_DAY",
        startDate: start,
        endDate: addDays(start, duration),
        totalDays: duration,
        reason: `${runTag} leave scenario ${index + 1}`,
        status: pick(["PENDING", "APPROVED", "DENIED"]),
        reviewedBy: pick([...admins, ...ceos, ...managers, u]).id,
        reviewNote: "Generated for workflow testing",
      },
    });
  }

  for (let i = 1; i <= 10; i += 1) {
    const author = pick(users);
    await prisma.suggestion.create({
      data: {
        userId: author.id,
        title: `${runTag} Suggestion ${i}`,
        content: `Sample suggestion content ${i}`,
        category: pick(["COMPLAINT", "SUGGESTION", "FEEDBACK", "REQUEST"]),
        isAnonymous: i % 3 === 0,
        status: pick(["OPEN", "IN_REVIEW", "ACTIONED", "CLOSED"]),
        hrNote: "Generated sample",
      },
    });
  }

  for (let i = 1; i <= 8; i += 1) {
    const requester = pick(users);
    const requisition = await prisma.requisition.create({
      data: {
        userId: requester.id,
        title: `${runTag} Requisition ${i}`,
        reason: "Testing procurement workflow",
        totalAmount: randomInt(10000, 250000),
        status: pick(["PENDING_FINANCE", "PENDING_CEO", "APPROVED", "DENIED"]),
        managerNote: "Generated manager note",
        financeNote: "Generated finance note",
        ceoNote: "Generated CEO note",
      },
    });

    const itemCount = randomInt(1, 3);
    for (let j = 1; j <= itemCount; j += 1) {
      await prisma.requisitionItem.create({
        data: {
          requisitionId: requisition.id,
          itemName: `Item ${j} for ${runTag} Req ${i}`,
          quantity: randomInt(1, 10),
          unitPrice: randomInt(2500, 40000),
          vatInclusive: j % 2 === 0,
        },
      });
    }
  }

  for (let i = 1; i <= 8; i += 1) {
    await prisma.refund.create({
      data: {
        userId: pick(users).id,
        amount: randomInt(5000, 120000),
        reason: `${runTag} refund test ${i}`,
        status: pick(["PENDING_FINANCE", "PENDING_CEO", "APPROVED", "DENIED"]),
        financeNote: "Generated finance review",
        ceoNote: "Generated CEO review",
      },
    });
  }

  for (let i = 1; i <= 10; i += 1) {
    const creator = pick(users);
    const assignee = pick(techUsers.length ? techUsers : [safeTech]);
    await prisma.iTTicket.create({
      data: {
        userId: creator.id,
        title: `${runTag} IT Ticket ${i}`,
        description: "Generated for IT support workflow testing",
        priority: pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        status: pick(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
        assignedUserId: assignee.id,
        resolvedAt: i % 4 === 0 ? addDays(new Date(), -1) : null,
      },
    });
  }

  for (let i = 1; i <= 30; i += 1) {
    await prisma.notification.create({
      data: {
        userId: pick(users).id,
        type: pick([
          "TASK_ASSIGNED",
          "TASK_CONFIRMED",
          "TASK_COMPLETED",
          "LEAVE_APPROVED",
          "LEAVE_DENIED",
          "REQUISITION_SUBMITTED",
          "REQUISITION_APPROVED",
          "REQUISITION_DENIED",
          "REFUND_SUBMITTED",
          "REFUND_APPROVED",
          "REFUND_DENIED",
          "IT_TICKET_ASSIGNED",
          "IT_TICKET_RESOLVED",
        ]),
        title: `${runTag} Notification ${i}`,
        message: "Sample notification generated for testing",
        link: pick(["/tasks", "/dashboard", "/requisitions", "/refunds", "/it-support", null]),
        isRead: i % 3 === 0,
      },
    });
  }

  const boardOwner = pick(users);
  const boardColumns = [
    { title: "To Do", code: "todo", kind: "TODO", mappedTaskStatus: "ASSIGNED", position: 0 },
    { title: "In Progress", code: "in-progress", kind: "IN_PROGRESS", mappedTaskStatus: "IN_PROGRESS", position: 1 },
    { title: "Done", code: "done", kind: "DONE", mappedTaskStatus: "DONE", position: 2 },
  ];

  for (const col of boardColumns) {
    await prisma.personalBoardColumn.upsert({
      where: { userId_code: { userId: boardOwner.id, code: col.code } },
      update: { title: col.title, kind: col.kind, mappedTaskStatus: col.mappedTaskStatus, position: col.position },
      create: { userId: boardOwner.id, ...col },
    });
  }

  const ownerCols = await prisma.personalBoardColumn.findMany({
    where: { userId: boardOwner.id },
    orderBy: { position: "asc" },
  });
  const todoCol = ownerCols.find((c) => c.code === "todo") || ownerCols[0];
  const doneCol = ownerCols.find((c) => c.code === "done") || ownerCols[ownerCols.length - 1];

  if (todoCol && doneCol) {
    for (let i = 1; i <= 6; i += 1) {
      const project = pick(projects);
      const isDone = i > 4;
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: `${runTag} Board Task ${i}`,
          description: "Board sample task",
          source: "SELF_BOARD",
          status: isDone ? "DONE" : "ASSIGNED",
          priority: "MEDIUM",
          deptId: boardOwner.departmentId,
          assignedUserId: boardOwner.id,
          createdById: boardOwner.id,
          startedAt: isDone ? addDays(new Date(), -2) : null,
          slaStartedAt: isDone ? addDays(new Date(), -2) : null,
          completedAt: isDone ? addDays(new Date(), -1) : null,
        },
      });

      await prisma.personalBoardCard.create({
        data: {
          ownerId: boardOwner.id,
          assignedById: pick(users).id,
          columnId: isDone ? doneCol.id : todoCol.id,
          taskId: task.id,
          projectId: project.id,
          clientId: project.clientId,
          title: task.title,
          description: task.description,
          position: i - 1,
          enteredColumnAt: isDone ? addDays(new Date(), -1) : new Date(),
        },
      });
    }
  }

  console.log("\n=== Active Users Test Data Seeded ===");
  console.log(`Run tag: ${runTag}`);
  console.log(`Used active users: ${users.length}`);
  console.log("Created:");
  console.log("- Clients: 4");
  console.log("- Projects: 6");
  console.log("- Tasks: 36 (+6 board tasks)");
  console.log("- Activity logs: many linked to tasks and daily log metadata");
  console.log("- Leaves: 6");
  console.log("- Suggestions: 10");
  console.log("- Requisitions: 8");
  console.log("- Refunds: 8");
  console.log("- IT Tickets: 10");
  console.log("- Notifications: 30");
  console.log("- Board sample columns/cards for one active user");
}

main()
  .catch((error) => {
    console.error("Failed to seed active-user test data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
