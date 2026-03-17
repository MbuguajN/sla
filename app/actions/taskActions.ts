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

// ============== TASK QUERIES ==============

export async function getTasks() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

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

// ============== TASK CREATION ==============

export async function createTask(data: {
  projectId: number;
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  deptId: number;
  slaHours?: number;
}) {
  const user = await getCurrentUser();
  if (!user || !canCreateTask(user)) {
    throw new Error("Unauthorized - Only Client Service and Business Development can create tasks");
  }

  // Get default SLA from project department if not specified
  let slaHours = data.slaHours;
  if (!slaHours) {
    const projectDept = await db.projectDepartment.findUnique({
      where: {
        projectId_departmentId: {
          projectId: data.projectId,
          departmentId: data.deptId,
        },
      },
    });
    slaHours = projectDept?.slaHours || 48;
  }

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

  revalidatePath("/tasks");
  revalidatePath(`/projects/${data.projectId}`);
  return task;
}

// ============== TASK ASSIGNMENT (Manager assigns to employee) ==============

export async function assignTask(taskId: number, assignedUserId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

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
    data: { status: "IN_PROGRESS" },
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

export async function addSubtask(taskId: number, title: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  // Only assignee or creator can add subtasks
  if (task.assignedUserId !== user.id && task.createdById !== user.id) {
    throw new Error("Unauthorized");
  }

  const subtask = await db.subtask.create({
    data: {
      taskId,
      title,
      status: "PENDING",
    },
  });

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

  // Only assignee can update subtask status
  if (subtask.task.assignedUserId !== user.id) {
    throw new Error("Unauthorized");
  }

  const updated = await db.subtask.update({
    where: { id: subtaskId },
    data: { status },
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

  // Only assignee or creator can delete subtasks
  if (
    subtask.task.assignedUserId !== user.id &&
    subtask.task.createdById !== user.id
  ) {
    throw new Error("Unauthorized");
  }

  await db.subtask.delete({ where: { id: subtaskId } });

  revalidatePath(`/tasks/${subtask.taskId}`);
}

