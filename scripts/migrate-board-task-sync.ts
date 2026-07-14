import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("=== Board-Task Sync Migration ===\n");

  // Step 1: Create workspaces for clients
  console.log("Step 1: Creating workspaces for clients...");
  const clients = await db.client.findMany({ where: { workspaceId: null } });
  const allUserIds = (await db.user.findMany({ where: { isActive: true }, select: { id: true } })).map((u) => u.id);

  for (const client of clients) {
    const workspace = await db.workspace.create({
      data: {
        name: client.name,
        ownerId: allUserIds[0] || 1,
        members: {
          create: allUserIds.map((uid) => ({ userId: uid, role: "MEMBER" })),
        },
      },
    });
    await db.client.update({ where: { id: client.id }, data: { workspaceId: workspace.id } });
    console.log(`  Created workspace "${workspace.name}" for client "${client.name}"`);
  }
  console.log(`  Done. ${clients.length} clients updated.\n`);

  // Step 2: Create boards for projects
  console.log("Step 2: Creating boards for projects...");
  const projects = await db.project.findMany({
    where: { boards: { none: {} } },
    include: { client: true },
  });

  for (const project of projects) {
    if (!project.client.workspaceId) continue;

    const board = await db.board.create({
      data: {
        workspaceId: project.client.workspaceId,
        title: project.title,
        type: "PROJECT",
        projectId: project.id,
        visibility: "WORKSPACE",
      },
    });

    await db.boardMember.createMany({
      data: allUserIds.map((uid) => ({ boardId: board.id, userId: uid, role: "MEMBER" })),
      skipDuplicates: true,
    });

    // Create default list
    await db.boardList.create({
      data: { boardId: board.id, title: "List 1", position: 0 },
    });

    console.log(`  Created board "${board.title}" for project "${project.title}"`);
  }
  console.log(`  Done. ${projects.length} projects updated.\n`);

  // Step 3: Create cards for tasks
  console.log("Step 3: Creating cards for tasks...");
  const tasks = await db.task.findMany({
    where: { workspaceBoardCardId: null },
    include: { project: { include: { client: true } } },
  });

  for (const task of tasks) {
    const board = await db.board.findUnique({ where: { projectId: task.projectId } });
    if (!board) continue;

    const list = await db.boardList.findFirst({
      where: { boardId: board.id },
      orderBy: { position: "asc" },
    });
    if (!list) continue;

    const maxPos = await db.boardCard.aggregate({ where: { listId: list.id }, _max: { position: true } });

    const card = await db.boardCard.create({
      data: {
        listId: list.id,
        title: task.title,
        description: task.description,
        assignedToUserId: task.assignedUserId,
        isCompleted: task.status === "DONE",
        position: (maxPos._max.position ?? -1) + 1,
        taskId: task.id,
      },
    });

    await db.task.update({ where: { id: task.id }, data: { workspaceBoardCardId: card.id } });

    // Add assignee as board member
    if (task.assignedUserId) {
      await db.boardMember.upsert({
        where: { boardId_userId: { boardId: board.id, userId: task.assignedUserId } },
        create: { boardId: board.id, userId: task.assignedUserId, role: "MEMBER" },
        update: {},
      });
    }

    console.log(`  Created card for task "${task.title}"`);
  }
  console.log(`  Done. ${tasks.length} tasks updated.\n`);

  // Step 4: Create checklist items for subtasks
  console.log("Step 4: Creating checklist items for subtasks...");
  const subtasks = await db.subtask.findMany({
    where: { checklistItemId: null },
    include: { task: true },
  });

  for (const subtask of subtasks) {
    const cardId = (subtask.task as any).workspaceBoardCardId;
    if (!cardId) continue;

    let checklist = await db.boardChecklist.findFirst({ where: { cardId } });
    if (!checklist) {
      checklist = await db.boardChecklist.create({
        data: { cardId, title: "Checklist", position: 0 },
      });
    }

    const maxPos = await db.boardChecklistItem.aggregate({
      where: { checklistId: checklist.id },
      _max: { position: true },
    });

    const item = await db.boardChecklistItem.create({
      data: {
        checklistId: checklist.id,
        title: subtask.title,
        isDone: subtask.status === "DONE",
        position: (maxPos._max.position ?? -1) + 1,
        subtaskId: subtask.id,
      },
    });

    await db.subtask.update({ where: { id: subtask.id }, data: { checklistItemId: item.id } });

    console.log(`  Created checklist item for subtask "${subtask.title}"`);
  }
  console.log(`  Done. ${subtasks.length} subtasks updated.\n`);

  // Step 5: Ensure standalone boards have project mappings
  console.log("Step 5: Mapping standalone boards...");
  const standaloneBoards = await db.board.findMany({ where: { projectId: null } });

  // Ensure Internal client exists
  let internalClient = await db.client.findFirst({ where: { name: "Internal" } });
  if (!internalClient) {
    internalClient = await db.client.create({
      data: { name: "Internal", status: "ACTIVE" },
    });
    const ws = await db.workspace.create({
      data: {
        name: "Internal",
        ownerId: allUserIds[0] || 1,
        members: {
          create: allUserIds.map((uid) => ({ userId: uid, role: "MEMBER" })),
        },
      },
    });
    await db.client.update({ where: { id: internalClient.id }, data: { workspaceId: ws.id } });
    console.log(`  Created "Internal" client and workspace`);
  }

  for (const board of standaloneBoards) {
    const project = await db.project.create({
      data: {
        clientId: internalClient.id,
        title: board.title,
        status: "ACTIVE",
      },
    });

    await db.board.update({
      where: { id: board.id },
      data: { type: "STANDALONE", projectId: project.id },
    });

    console.log(`  Mapped board "${board.title}" to project "${project.title}"`);
  }
  console.log(`  Done. ${standaloneBoards.length} boards updated.\n`);

  console.log("=== Migration Complete ===");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
