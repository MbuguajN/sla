"use server";

import { db } from "@/lib/db";
import {
  getCurrentUser,
  canCreateTask,
  canConfirmTask,
  canPauseTask,
  canSubmitTask,
  canMarkTaskDone,
  canRequestRevision,
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { isUserCurrentlyOnApprovedLeave, processLeaveTaskHandovers } from "./leaveHandoverActions";

// ============== CLEAR LATEST ACTIVITY ==============

export async function clearLatestActivity() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch all visible activity IDs for this user, then bulk-hide them
  const activities = await db.activityLog.findMany({
    where: {
      OR: [
        { userId: user.id },
        ...(user.role === "MANAGER" && user.departmentId
          ? [{ task: { deptId: user.departmentId } }]
          : []),
        ...(user.departmentSlug === "business-development"
          ? [{ task: { createdById: user.id } }]
          : []),
        { task: { createdById: user.id } },
        { task: { assignedUserId: user.id } },
        ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
      ],
      isHiddenFromDashboard: false,
    },
    select: { id: true },
  });

  if (activities.length > 0) {
    await db.activityLog.updateMany({
      where: { id: { in: activities.map((a) => a.id) } },
      data: { isHiddenFromDashboard: true },
    });
    revalidatePath("/dashboard");
  }
}

// ============== TASK QUERIES ==============

export async function getTasks() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await processLeaveTaskHandovers();

  // Admin/CEO see all tasks
  if (user.role === "ADMIN" || user.role === "CEO") {
    return db.task.findMany({
      include: {
        project: { include: { client: true } },
        assignedTo: true,
        assignedDepartment: true,
        createdBy: true,
        subtasks: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Managers see tasks in their department + tasks they created
  if (user.role === "MANAGER" && user.departmentId) {
    return db.task.findMany({
      where: {
        OR: [
          { deptId: user.departmentId },
          { createdById: user.id },
          { assignedUserId: user.id },
        ],
      },
      include: {
        project: { include: { client: true } },
        assignedTo: true,
        assignedDepartment: true,
        createdBy: true,
        subtasks: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Employees see tasks assigned to them or created by them
  return db.task.findMany({
    where: {
      OR: [{ assignedUserId: user.id }, { createdById: user.id }],
    },
    include: {
      project: { include: { client: true } },
      assignedTo: true,
      assignedDepartment: true,
      createdBy: true,
      subtasks: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTask(taskId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await processLeaveTaskHandovers();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { client: true } },
      assignedTo: true,
      assignedDepartment: true,
      createdBy: true,
      subtasks: true,
      activityLog: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!task) throw new Error("Task not found");

  // Check access
  const canAccess =
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    task.createdById === user.id ||
    task.assignedUserId === user.id ||
    task.deptId === user.departmentId;

  if (!canAccess) throw new Error("Unauthorized");

  return task;
}

// ============== TASK LINKS (Initiator Only) ==============

export async function addTaskLink(taskId: number, name: string, url: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (task.createdById !== user.id) {
    throw new Error("Unauthorized - Only the initiator can add links");
  }

  const link = await db.taskLink.create({
    data: { taskId, name, url },
  });

  await db.activityLog.create({
    data: {
      type: "COMMENTED", // Reusing type for link addition
      description: `Added resource link: ${name}`,
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  revalidatePath(`/tasks/${taskId}`);
  return link;
}

export async function deleteTaskLink(linkId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const link = await db.taskLink.findUnique({
    where: { id: linkId },
    include: { task: true },
  });
  if (!link) throw new Error("Link not found");

  if (link.task.createdById !== user.id) {
    throw new Error("Unauthorized - Only the initiator can delete links");
  }

  await db.taskLink.delete({ where: { id: linkId } });
  revalidatePath(`/tasks/${link.taskId}`);
}

// ============== TASK CREATION ==============

export async function createTask(data: {
  projectId: number;
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  deptId: number;
  slaHours?: number;
  links?: { name: string; url: string }[];
}) {
  const user = await getCurrentUser();
  if (!user || !canCreateTask(user)) {
    throw new Error("Unauthorized - Only Client Service and Business Development can create tasks");
  }

  // Check if project and client exist and are valid
  const project = await db.project.findUnique({
    where: { id: data.projectId },
    include: { client: true },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.client.status === "CLOSED") {
    throw new Error("Cannot create tasks for projects with closed clients");
  }

  if (project.status !== "ACTIVE") {
    throw new Error(`Cannot create tasks for projects that are ${project.status.replace("_", " ").toLowerCase()}`);
  }

  // SLA is managed at task level.
  const slaHours = data.slaHours || 48;

  // Filter out empty links
  const validLinks = (data.links || []).filter(l => l.name.trim() && l.url.trim());

  const task = await db.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      priority: data.priority || "MEDIUM",
      deptId: data.deptId,
      createdById: user.id,
      slaHours,
      status: "UNASSIGNED",
      ...(validLinks.length > 0 && {
        links: {
          create: validLinks.map(l => ({ name: l.name, url: l.url })),
        },
      }),
    },
    include: {
      project: true,
      assignedDepartment: true,
    },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      type: "CREATED",
      description: `Task created and sent to ${task.assignedDepartment?.name || "department"}`,
      taskId: task.id,
      projectId: data.projectId,
      userId: user.id,
    },
  });

  // Notify department manager(s)
  if (task.deptId) {
    const managers = await db.user.findMany({
      where: {
        departmentId: task.deptId,
        role: "MANAGER",
      },
    });

    for (const manager of managers) {
      await createNotification(
        manager.id,
        "TASK_ASSIGNED", // Reusing type for department assignment
        "New Department Task",
        `A new task has been created for your department: ${task.title}`,
        `/tasks/${task.id}`
      );
    }
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${data.projectId}`);
  return task;
}

// ============== TASK ASSIGNMENT (Manager assigns to employee) ==============

export async function assignTask(taskId: number, assignedUserId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await processLeaveTaskHandovers();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignedDepartment: true },
  });

  if (!task) throw new Error("Task not found");

  if (user.role !== "MANAGER" || !user.departmentId || user.departmentId !== task.deptId) {
    throw new Error("Unauthorized - Only the manager of this department can assign tasks");
  }

  if (task.status !== "UNASSIGNED" && task.status !== "ASSIGNED") {
    throw new Error("Task can only be assigned while UNASSIGNED or ASSIGNED");
  }

  // Verify assignee is in the same department
  const assignee = await db.user.findUnique({
    where: { id: assignedUserId },
  });

  if (!assignee || assignee.departmentId !== task.deptId) {
    throw new Error("Assignee must be in the task's department");
  }

  const assigneeLeave = await isUserCurrentlyOnApprovedLeave(assignedUserId);
  if (assigneeLeave) {
    const returnDate = new Date(assigneeLeave.endDate);
    returnDate.setDate(returnDate.getDate() + 1);
    throw new Error(
      `Cannot assign task. ${assignee.name} is currently on approved leave until ${returnDate.toLocaleDateString()}`
    );
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      assignedUserId,
      status: "ASSIGNED",
    },
    include: { assignedTo: true, project: { include: { client: true } } },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      type: "ASSIGNED",
      description: `Task assigned to ${assignee.name}`,
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  // Create notification
  await createNotification(
    assignedUserId,
    "TASK_ASSIGNED",
    "Task Assigned",
    `You have been assigned: ${task.title}`,
    `/tasks/${taskId}`
  );

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== CONFIRM TASK (Assignee confirms receipt) ==============

export async function confirmTask(taskId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (!canConfirmTask(user.id, task.assignedUserId)) {
    throw new Error("Unauthorized - Only the assignee can confirm the task");
  }

  if (task.status !== "ASSIGNED") {
    throw new Error("Task must be in ASSIGNED status to confirm");
  }

  // Start SLA timer
  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      slaStartedAt: new Date(),
    },
  });

  await db.activityLog.create({
    data: {
      type: "CONFIRMED",
      description: "Task confirmed and SLA timer started",
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== START WORK ==============

export async function startTask(taskId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (task.assignedUserId !== user.id) {
    throw new Error("Unauthorized - Only the assignee can start the task");
  }

  if (task.status !== "CONFIRMED" && task.status !== "REVISION") {
    throw new Error("Task must be CONFIRMED or in REVISION to start");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: "IN_PROGRESS",
      ...(task.startedAt ? {} : { startedAt: new Date() }),
    },
  });

  await db.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: "Work started on task",
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== PAUSE TASK (with SLA pause) ==============

export async function pauseTask(taskId: number, reason: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (!canPauseTask(user.id, task.assignedUserId)) {
    throw new Error("Unauthorized - Only the assignee can pause the task");
  }

  if (task.status !== "IN_PROGRESS") {
    throw new Error("Task must be IN_PROGRESS to pause");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: "PAUSED",
      slaPausedAt: new Date(),
    },
  });

  await db.activityLog.create({
    data: {
      type: "PAUSED",
      description: `Task paused: ${reason}`,
      taskId,
      projectId: task.projectId,
      userId: user.id,
      metadata: JSON.stringify({ reason }),
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== RESUME TASK (with SLA resume) ==============

export async function resumeTask(taskId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (task.assignedUserId !== user.id) {
    throw new Error("Unauthorized - Only the assignee can resume the task");
  }

  if (task.status !== "PAUSED") {
    throw new Error("Task must be PAUSED to resume");
  }

  // Calculate paused duration
  let pausedDuration = task.slaPausedDuration || 0;
  if (task.slaPausedAt) {
    const pauseTime = new Date().getTime() - task.slaPausedAt.getTime();
    pausedDuration += Math.floor(pauseTime / 1000); // in seconds
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: "IN_PROGRESS",
      slaPausedAt: null,
      slaPausedDuration: pausedDuration,
    },
  });

  await db.activityLog.create({
    data: {
      type: "RESUMED",
      description: "Task resumed",
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== SUBMIT TASK FOR REVIEW ==============

export async function submitTask(taskId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (!canSubmitTask(user.id, task.assignedUserId)) {
    throw new Error("Unauthorized - Only the assignee can submit the task");
  }

  if (task.status !== "IN_PROGRESS") {
    throw new Error("Task must be IN_PROGRESS to submit");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  await db.activityLog.create({
    data: {
      type: "SUBMITTED",
      description: "Task submitted for review",
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== REQUEST REVISION (by task initiator) ==============

export async function requestRevision(taskId: number, reason: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (!canRequestRevision(user, task.createdById)) {
    throw new Error("Unauthorized - Only the task initiator can request revision");
  }

  if (task.status !== "SUBMITTED") {
    throw new Error("Task must be SUBMITTED to request revision");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { status: "REVISION" },
  });

  await db.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: `Revision requested: ${reason}`,
      taskId,
      projectId: task.projectId,
      userId: user.id,
      metadata: JSON.stringify({ reason }),
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== MARK AS DONE (by task initiator) ==============

export async function completeTask(taskId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (!canMarkTaskDone(user, task.createdById)) {
    throw new Error("Unauthorized - Only the task initiator can mark as done");
  }

  if (task.status !== "SUBMITTED") {
    throw new Error("Task must be SUBMITTED to mark as done");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: "DONE",
      completedAt: new Date(),
    },
    include: { assignedTo: true },
  });

  await db.activityLog.create({
    data: {
      type: "COMPLETED",
      description: "Task marked as complete",
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  // Create notification for assignee
  if (task.assignedUserId) {
    await createNotification(
      task.assignedUserId,
      "TASK_COMPLETED",
      "Task Completed",
      `Your task has been marked as complete`,
      `/tasks/${taskId}`
    );
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== CANCEL TASK ==============

export async function cancelTask(taskId: number, reason: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  // Only creator, admin, or CEO can cancel
  if (task.createdById !== user.id && user.role !== "ADMIN" && user.role !== "CEO") {
    throw new Error("Unauthorized");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { status: "CANCELLED" },
  });

  await db.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: `Task cancelled: ${reason}`,
      taskId,
      projectId: task.projectId,
      userId: user.id,
      metadata: JSON.stringify({ reason }),
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== SUBTASK MANAGEMENT ==============

export async function addSubtask(taskId: number, title: string, description?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  // Only initiator (creator) in Client Service or Business Development can add subtasks.
  if (
    task.createdById !== user.id ||
    user.departmentSlug !== "client-service" &&
    user.departmentSlug !== "business-development"
  ) {
    throw new Error("Unauthorized - Only the initiator in Client Service or Business Development can add subtasks");
  }

  let subtask;
  if (task.status === "SUBMITTED") {
    // Re-open: atomically revert status to IN_PROGRESS, then create subtask
    const [, created] = await db.$transaction([
      db.task.update({ where: { id: taskId }, data: { status: "IN_PROGRESS" } }),
      db.subtask.create({ data: { taskId, title, description, status: "PENDING" } }),
    ]);
    subtask = created;
  } else {
    subtask = await db.subtask.create({
      data: { taskId, title, description, status: "PENDING" },
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  return subtask;
}

export async function updateSubtaskStatus(
  subtaskId: number,
  status: "PENDING" | "IN_PROGRESS" | "DONE"
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const subtask = await db.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: true },
  });

  if (!subtask) throw new Error("Subtask not found");

  // Only assignee can mark subtasks complete/incomplete.
  if (subtask.task.assignedUserId !== user.id) {
    throw new Error("Unauthorized - Only the assignee can mark subtasks complete");
  }

  const normalizedStatus = status === "DONE" ? "DONE" : "PENDING";

  const updated = await db.subtask.update({
    where: { id: subtaskId },
    data: { status: normalizedStatus },
  });

  revalidatePath(`/tasks/${subtask.taskId}`);
  return updated;
}

export async function deleteSubtask(subtaskId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const subtask = await db.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: true },
  });

  if (!subtask) throw new Error("Subtask not found");

  // Allow only initiator (creator) in Client Service or Business Development to delete subtasks.
  if (
    subtask.task.createdById !== user.id ||
    user.departmentSlug !== "client-service" &&
    user.departmentSlug !== "business-development"
  ) {
    throw new Error("Unauthorized - Only the initiator in Client Service or Business Development can delete subtasks");
  }

  await db.subtask.delete({ where: { id: subtaskId } });

  revalidatePath(`/tasks/${subtask.taskId}`);
}

// ============== TASK COMMENTS & RESOURCES ==============

export async function addTaskComment(taskId: number, comment: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const trimmed = comment.trim();
  if (!trimmed) throw new Error("Comment cannot be empty");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  const canAccess =
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    task.createdById === user.id ||
    task.assignedUserId === user.id ||
    task.deptId === user.departmentId;

  if (!canAccess) throw new Error("Unauthorized");

  const activity = await db.activityLog.create({
    data: {
      type: "COMMENTED",
      description: "added a comment",
      taskId,
      projectId: task.projectId,
      userId: user.id,
      metadata: JSON.stringify({ kind: "COMMENT", comment: trimmed }),
    },
    include: { user: true },
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");

  return {
    id: activity.id,
    type: activity.type,
    description: activity.description,
    userName: activity.user.name,
    createdAt: activity.createdAt.toISOString(),
    metadata: activity.metadata,
  };
}

export async function addTaskResource(taskId: number, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  // Only the task initiator can add resources.
  if (task.createdById !== user.id) {
    throw new Error("Unauthorized - Only the initiator can add resources");
  }

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = join(process.cwd(), "public", "uploads", "task-resources");
  await mkdir(uploadsDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "resource.bin";
  const filename = `${Date.now()}-${taskId}-${safeName}`;
  const filepath = join(uploadsDir, filename);

  await writeFile(filepath, buffer);

  const publicUrl = `/uploads/task-resources/${filename}`;
  const metadata = {
    kind: "RESOURCE",
    fileName: file.name,
    fileUrl: publicUrl,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };

  const activity = await db.activityLog.create({
    data: {
      type: "COMMENTED",
      description: `uploaded resource \"${file.name}\"`,
      taskId,
      projectId: task.projectId,
      userId: user.id,
      metadata: JSON.stringify(metadata),
    },
    include: { user: true },
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");

  return {
    id: activity.id,
    type: activity.type,
    description: activity.description,
    userName: activity.user.name,
    createdAt: activity.createdAt.toISOString(),
    metadata: activity.metadata,
  };
}

