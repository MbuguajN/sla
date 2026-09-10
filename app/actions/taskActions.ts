"use server";

import { db } from "@/lib/db";
import {
  getCurrentUser,
  canCreateTask,
  canAssignTasks,
  canAssignTasksToDepartment,
  canConfirmTask,
  canPauseTask,
  canSubmitTask,
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { syncTaskToCard, syncSubtaskToChecklistItem, addBoardMemberForAssignee, syncChecklistItemToSubtask, syncCardToTask } from "./boardTaskSync";
import { createNotification } from "./notificationActions";
import { sendNotificationEmail } from "@/lib/email";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import { isUserCurrentlyOnApprovedLeave, processLeaveTaskHandovers } from "./leaveHandoverActions";

/**
 * HANDOFF NOTIFICATIONS
 *
 * The workflow is a relay: intake -> department head -> assignee -> back to the
 * initiator. Every hop announces itself here, so nobody has to poll the app to
 * discover it is their turn.
 */

type TaskAudience = {
  initiatorId: number | null;
  assigneeId: number | null;
  managerIds: number[];
};

async function getTaskAudience(task: {
  createdById: number | null;
  assignedUserId: number | null;
  deptId: number | null;
}): Promise<TaskAudience> {
  const managers = task.deptId
    ? await db.user.findMany({
        where: { departmentId: task.deptId, role: "MANAGER", isActive: true },
        select: { id: true },
      })
    : [];

  return {
    initiatorId: task.createdById,
    assigneeId: task.assignedUserId,
    managerIds: managers.map((m) => m.id),
  };
}

/**
 * Notify a set of people once each, skipping the actor and any duplicates.
 * Failures never block the transition that triggered them.
 */
async function notifyTaskParties(params: {
  userIds: (number | null | undefined)[];
  actorId: number;
  type: string;
  title: string;
  message: string;
  taskId: number;
  email?: { subject: string; heading: string; body: string };
}) {
  const link = `/tasks/${params.taskId}`;
  const recipients = [...new Set(params.userIds.filter((id): id is number => !!id))]
    .filter((id) => id !== params.actorId);
  if (recipients.length === 0) return;

  const users = await db.user.findMany({
    where: { id: { in: recipients }, isActive: true },
    select: { id: true, email: true },
  });

  for (const recipient of users) {
    await createNotification(
      recipient.id,
      params.type,
      params.title,
      params.message,
      link
    ).catch((e) => console.error("Task notification failed:", e));

    if (params.email && recipient.email) {
      await sendNotificationEmail(
        recipient.email,
        params.email.subject,
        params.email.heading,
        params.email.body,
        link
      ).catch((e) => console.error("Task email failed:", e));
    }
  }
}

/**
 * Who may close or bounce back submitted work.
 *
 * The initiator first, but never only the initiator: delivered work must not sit
 * in SUBMITTED because one person is on leave. Their department peers and their
 * manager can close it too, and the activity log records who did.
 */
async function canCloseTask(
  user: { id: number; role: string; departmentId: number | null; isGeneralManager?: boolean },
  task: { createdById: number | null }
): Promise<boolean> {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  if (user.isGeneralManager) return true;
  if (task.createdById === user.id) return true;
  if (!task.createdById) return true;

  const initiator = await db.user.findUnique({
    where: { id: task.createdById },
    select: { departmentId: true },
  });
  if (!initiator?.departmentId || !user.departmentId) return false;

  // A peer in the initiating department, or that department's manager.
  return initiator.departmentId === user.departmentId;
}

const MAX_TASK_RESOURCE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_TASK_RESOURCE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_TASK_RESOURCE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
]);

function startsWithBytes(buffer: Buffer, bytes: number[]) {
  if (buffer.length < bytes.length) return false;
  return bytes.every((value, index) => buffer[index] === value);
}

function detectFileSignature(buffer: Buffer):
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"
  | "application/pdf"
  | "text/plain"
  | "unknown" {
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (
    startsWithBytes(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";

  const isLikelyText = buffer
    .subarray(0, Math.min(buffer.length, 2048))
    .every((byte) => byte === 0x09 || byte === 0x0a || byte === 0x0d || (byte >= 0x20 && byte <= 0x7e));
  if (isLikelyText) return "text/plain";

  return "unknown";
}

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
    user.role === "MANAGER" ||
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
  briefReceivedAt: string;
  slaHours?: number;
  links?: { name: string; url: string }[];
  includedDeptSubtasks?: { deptId: number; title: string; description?: string }[];
}) {
  const user = await getCurrentUser();
  if (!user || !canCreateTask(user)) {
    throw new Error("Unauthorized - You do not have permission to create tasks");
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

  if (!data.briefReceivedAt) {
    throw new Error("Brief received date is required");
  }

  const briefReceivedAt = new Date(data.briefReceivedAt);
  if (Number.isNaN(briefReceivedAt.getTime())) {
    throw new Error("Invalid brief received date");
  }

  const assignedDepartment = await db.department.findUnique({
    where: { id: data.deptId },
    select: { id: true, slug: true, name: true },
  });

  if (!assignedDepartment) {
    throw new Error("Assigned department not found");
  }

  if (!canAssignTasksToDepartment(assignedDepartment.slug)) {
    throw new Error("This department cannot be assigned tasks from this workflow");
  }

  const routedSubtasks = (data.includedDeptSubtasks || [])
    .map((entry) => ({
      deptId: entry.deptId,
      title: entry.title.trim(),
      description: entry.description?.trim() || "",
    }))
    .filter((entry) => entry.deptId && entry.title.length > 0);

  const routedDeptIds = [...new Set(routedSubtasks.map((entry) => entry.deptId))];
  const routedDepartments = routedDeptIds.length
    ? await db.department.findMany({
        where: { id: { in: routedDeptIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const routedDepartmentById = new Map(routedDepartments.map((dept) => [dept.id, dept]));

  for (const routed of routedSubtasks) {
    const dept = routedDepartmentById.get(routed.deptId);
    if (!dept) {
      throw new Error("One or more included departments were not found");
    }
    if (!canAssignTasksToDepartment(dept.slug)) {
      throw new Error(`${dept.name} cannot receive routed subtasks from this workflow`);
    }
  }

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcBrief = Date.UTC(
    briefReceivedAt.getUTCFullYear(),
    briefReceivedAt.getUTCMonth(),
    briefReceivedAt.getUTCDate()
  );
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysSinceBrief = Math.floor((utcToday - utcBrief) / msPerDay);
  const briefCategory = daysSinceBrief > 3 ? "SAT" : "SAFE";

  const minSlaSetting = await db.systemSetting.findUnique({
    where: { key: "task_sla_min_hours" },
    select: { value: true },
  });
  const configuredMinSla = Number.parseInt(minSlaSetting?.value || "1", 10);
  const minSlaHours = Number.isNaN(configuredMinSla) ? 1 : Math.max(1, configuredMinSla);

  // SLA is managed at task level.
  const slaHours = data.slaHours || 48;
  if (slaHours < minSlaHours) {
    throw new Error(`SLA commitment cannot be below ${minSlaHours} hours`);
  }

  // Filter out empty links
  const validLinks = (data.links || []).filter(l => l.name.trim() && l.url.trim());

  const task = await db.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      priority: data.priority || "MEDIUM",
      deptId: assignedDepartment.id,
      createdById: user.id,
      slaHours,
      briefReceivedAt,
      briefCategory,
      status: "UNASSIGNED",
      // The clock starts when the work arrives. Waiting for a department head
      // to assign it, and for the assignee to accept, is part of the turnaround
      // the client experiences.
      slaStartedAt: new Date(),
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

  if (routedSubtasks.length > 0) {
    for (const routed of routedSubtasks) {
      const targetDepartment = routedDepartmentById.get(routed.deptId);
      if (!targetDepartment) continue;

      await db.subtask.create({
        data: {
          taskId: task.id,
          title: routed.title,
          description: routed.description || null,
          status: "PENDING",
          deptId: targetDepartment.id,
        },
      });

      const managers = await db.user.findMany({
        where: {
          departmentId: targetDepartment.id,
          role: "MANAGER",
        },
      });

      for (const manager of managers) {
        await createNotification(
          manager.id,
          "TASK_ASSIGNED",
          "Subtask Routed To Your Department",
          `${user.name} routed \"${routed.title}\" under task \"${task.title}\" to ${targetDepartment.name}. Please assign it to your team.`,
          `/tasks/${task.id}`
        );
      }
    }
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${data.projectId}`);

  await syncTaskToCard(task.id).catch(() => {});

  return task;
}

// ============== TASK ASSIGNMENT (Manager assigns to employee) ==============

export async function assignTask(taskId: number, assignedUserId: number, reason?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await processLeaveTaskHandovers();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignedDepartment: true },
  });

  if (!task) throw new Error("Task not found");

  const isManagerOfTaskDept = user.role === "MANAGER" && !!user.departmentId && user.departmentId === task.deptId;
  if (!canAssignTasks(user) && !isManagerOfTaskDept) {
    throw new Error("Unauthorized - Only the CEO, managers, or admins can assign tasks");
  }

  // Reassignment stays possible until the task is closed. Freezing it at
  // CONFIRMED meant a confirmed task could never be handed over when the
  // assignee fell ill, short of the leave-handover job.
  if (task.status === "DONE" || task.status === "CANCELLED") {
    throw new Error("A closed task cannot be reassigned");
  }

  if (task.assignedUserId === assignedUserId) {
    throw new Error("That person is already assigned to this task");
  }

  const previousAssigneeId = task.assignedUserId;
  const isReassignment = Boolean(previousAssigneeId);

  // Verify assignee is in the same department
  const assignee = await db.user.findUnique({
    where: { id: assignedUserId },
  });

  if (!assignee || !assignee.isActive) {
    throw new Error("Assignee must be an active user");
  }

  if (user.role === "MANAGER" && assignee.departmentId !== task.deptId) {
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
      assignedAt: new Date(),
      // The new assignee has not accepted yet, so any prior acceptance and
      // in-progress state is cleared.
      confirmedAt: null,
      slaPausedAt: null,
    },
    include: { assignedTo: true, project: { include: { client: true } } },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      type: isReassignment ? "REASSIGNED" : "ASSIGNED",
      description: isReassignment
        ? `Task reassigned to ${assignee.name}${reason ? `: ${reason}` : ""}`
        : `Task assigned to ${assignee.name}`,
      taskId,
      projectId: task.projectId,
      userId: user.id,
      ...(reason ? { metadata: JSON.stringify({ reason }) } : {}),
    },
  });

  const clientName = updatedTask.project?.client?.name || "a project";
  const audience = await getTaskAudience({ ...task, assignedUserId });

  // The new assignee.
  await notifyTaskParties({
    userIds: [assignedUserId],
    actorId: user.id,
    type: "TASK_ASSIGNED",
    title: "Task Assigned",
    message: `You have been assigned: ${task.title}`,
    taskId,
    email: {
      subject: `Task Assigned: ${task.title}`,
      heading: "Task Assigned",
      body: `You have been assigned a task in <strong>${clientName}</strong>: <strong>${task.title}</strong>.`,
    },
  });

  // The person losing it, and whoever raised it.
  if (isReassignment) {
    await notifyTaskParties({
      userIds: [previousAssigneeId],
      actorId: user.id,
      type: "TASK_REASSIGNED",
      title: "Task Reassigned",
      message: `"${task.title}" was reassigned to ${assignee.name}${reason ? `: ${reason}` : ""}`,
      taskId,
    });
  }

  await notifyTaskParties({
    userIds: [audience.initiatorId],
    actorId: user.id,
    type: isReassignment ? "TASK_REASSIGNED" : "TASK_ASSIGNED",
    title: isReassignment ? "Task Reassigned" : "Task Assigned",
    message: `${user.name} ${isReassignment ? "reassigned" : "assigned"} "${task.title}" to ${assignee.name}`,
    taskId,
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);

  if (updatedTask.workspaceBoardCardId) {
    const card = await db.boardCard.findUnique({
      where: { id: updatedTask.workspaceBoardCardId },
      include: { list: { include: { board: true } } },
    });
    if (card) {
      await addBoardMemberForAssignee(card.list.board.id, assignedUserId).catch(() => {});
      await db.boardCard.update({
        where: { id: updatedTask.workspaceBoardCardId },
        data: { assignedToUserId: assignedUserId },
      }).catch(() => {});
    }
  }

  return updatedTask;
}

// ============== DECLINE TASK (Assignee cannot take it) ==============

/**
 * The assignee hands the task back to their department head instead of sitting
 * on work they cannot do. Without this the only way to say no was out of band.
 */
export async function declineTask(taskId: number, reason: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const trimmedReason = reason?.trim();
  if (!trimmedReason) throw new Error("Please say why you cannot take this task");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (task.assignedUserId !== user.id) {
    throw new Error("Unauthorized - Only the assignee can decline this task");
  }

  if (task.status !== "ASSIGNED" && task.status !== "CONFIRMED") {
    throw new Error("A task can only be declined before work starts");
  }

  const audience = await getTaskAudience(task);

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      assignedUserId: null,
      status: "UNASSIGNED",
      assignedAt: null,
      confirmedAt: null,
    },
  });

  await db.activityLog.create({
    data: {
      type: "DECLINED",
      description: `${user.name} declined the task: ${trimmedReason}`,
      taskId,
      projectId: task.projectId,
      userId: user.id,
      metadata: JSON.stringify({ reason: trimmedReason }),
    },
  });

  // Straight back to the people who can reassign it, plus the initiator.
  await notifyTaskParties({
    userIds: [...audience.managerIds, audience.initiatorId],
    actorId: user.id,
    type: "TASK_DECLINED",
    title: "Task Declined",
    message: `${user.name} declined "${task.title}": ${trimmedReason}. It needs reassigning.`,
    taskId,
    email: {
      subject: `Task Declined: ${task.title}`,
      heading: "Task Declined — needs reassigning",
      body: `<strong>${user.name}</strong> declined <strong>"${task.title}"</strong>.<br/><br/>Reason: ${trimmedReason}`,
    },
  });

  if (task.workspaceBoardCardId) {
    await db.boardCard.update({
      where: { id: task.workspaceBoardCardId },
      data: { assignedToUserId: null },
    }).catch(() => {});
  }

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

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      // The clock already started at intake; keep the earlier of the two so a
      // late acceptance cannot reset the client's turnaround.
      slaStartedAt: task.slaStartedAt ?? new Date(),
    },
  });

  await db.activityLog.create({
    data: {
      type: "CONFIRMED",
      description: "Task accepted by assignee",
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  const audience = await getTaskAudience(task);
  await notifyTaskParties({
    userIds: [audience.initiatorId, ...audience.managerIds],
    actorId: user.id,
    type: "TASK_CONFIRMED",
    title: "Task Accepted",
    message: `${user.name} accepted "${task.title}"`,
    taskId,
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

  // ASSIGNED is allowed so the assignee can accept and start in one action
  // rather than clicking a confirmation that carries no other information.
  if (task.status !== "ASSIGNED" && task.status !== "CONFIRMED" && task.status !== "REVISION") {
    throw new Error("Task must be assigned, accepted, or in revision to start");
  }

  const acceptedNow = task.status === "ASSIGNED";

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: "IN_PROGRESS",
      ...(task.startedAt ? {} : { startedAt: new Date() }),
      ...(task.confirmedAt ? {} : { confirmedAt: new Date() }),
      ...(task.slaStartedAt ? {} : { slaStartedAt: new Date() }),
    },
  });

  await db.activityLog.create({
    data: {
      type: acceptedNow ? "CONFIRMED" : "STATUS_CHANGED",
      description: acceptedNow ? "Task accepted and started" : "Work started on task",
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  const audience = await getTaskAudience(task);
  await notifyTaskParties({
    userIds: [audience.initiatorId],
    actorId: user.id,
    type: "TASK_STARTED",
    title: "Work Started",
    message: `${user.name} started work on "${task.title}"`,
    taskId,
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

  const audience = await getTaskAudience(task);
  await notifyTaskParties({
    userIds: [audience.initiatorId, ...audience.managerIds],
    actorId: user.id,
    type: "TASK_PAUSED",
    title: "Task Paused",
    message: `${user.name} paused "${task.title}": ${reason}`,
    taskId,
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

  const audience = await getTaskAudience(task);
  await notifyTaskParties({
    userIds: [audience.initiatorId],
    actorId: user.id,
    type: "TASK_STARTED",
    title: "Task Resumed",
    message: `${user.name} resumed work on "${task.title}"`,
    taskId,
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

  // The initiator is the only person who can close or bounce this back, so they
  // are the one who has to hear about it.
  const audience = await getTaskAudience(task);
  const taskWithProject = await db.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { client: { select: { name: true } } } } },
  });
  const clientName = taskWithProject?.project?.client?.name || "a project";

  await notifyTaskParties({
    userIds: [audience.initiatorId, ...audience.managerIds],
    actorId: user.id,
    type: "TASK_SUBMITTED",
    title: "Task Submitted For Review",
    message: `${user.name} submitted "${task.title}" for your review`,
    taskId,
    email: {
      subject: `Ready for review: ${task.title}`,
      heading: "Task Submitted For Review",
      body: `<strong>${user.name}</strong> submitted <strong>"${task.title}"</strong> (${clientName}) for review.<br/><br/>Please mark it complete or request a revision.`,
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

  if (!(await canCloseTask(user, task))) {
    throw new Error("Unauthorized - Only the initiating team can request a revision");
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

  const audience = await getTaskAudience(task);
  await notifyTaskParties({
    userIds: [audience.assigneeId, ...audience.managerIds],
    actorId: user.id,
    type: "TASK_REVISION_REQUESTED",
    title: "Revision Requested",
    message: `${user.name} requested changes on "${task.title}": ${reason}`,
    taskId,
    email: {
      subject: `Revision requested: ${task.title}`,
      heading: "Revision Requested",
      body: `<strong>${user.name}</strong> requested changes on <strong>"${task.title}"</strong>.<br/><br/>Reason: ${reason}`,
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

  if (!(await canCloseTask(user, task))) {
    throw new Error("Unauthorized - Only the initiating team can mark this as done");
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

  if (task.workspaceBoardCardId) {
    await db.boardCard.update({
      where: { id: task.workspaceBoardCardId },
      data: { isCompleted: true },
    }).catch(() => {});
  }

  await db.activityLog.create({
    data: {
      type: "COMPLETED",
      description: "Task marked as complete",
      taskId,
      projectId: task.projectId,
      userId: user.id,
    },
  });

  const audience = await getTaskAudience(task);
  await notifyTaskParties({
    userIds: [audience.assigneeId, audience.initiatorId, ...audience.managerIds],
    actorId: user.id,
    type: "TASK_COMPLETED",
    title: "Task Completed",
    message: `${user.name} marked "${task.title}" complete`,
    taskId,
  });

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

  const audience = await getTaskAudience(task);
  await notifyTaskParties({
    userIds: [audience.assigneeId, ...audience.managerIds],
    actorId: user.id,
    type: "TASK_CANCELLED",
    title: "Task Cancelled",
    message: `${user.name} cancelled "${task.title}": ${reason}`,
    taskId,
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return updatedTask;
}

// ============== SUBTASK MANAGEMENT ==============

export async function addSubtask(
  taskId: number,
  title: string,
  description?: string,
  options?: { deptId?: number | null; assignedUserId?: number | null }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  // Only the initiator (creator) can add subtasks.
  if (task.createdById !== user.id) {
    throw new Error("Unauthorized - Only the task initiator can add subtasks");
  }

  const data = {
    taskId,
    title,
    description,
    status: "PENDING" as const,
    deptId: options?.deptId ?? null,
    assignedUserId: options?.assignedUserId ?? null,
  };

  let subtask;
  if (task.status === "SUBMITTED") {
    // Re-open: atomically revert status to IN_PROGRESS, then create subtask
    const [, created] = await db.$transaction([
      db.task.update({ where: { id: taskId }, data: { status: "IN_PROGRESS" } }),
      db.subtask.create({ data }),
    ]);
    subtask = created;
  } else {
    subtask = await db.subtask.create({ data });
  }

  if (options?.assignedUserId) {
    await notifyTaskParties({
      userIds: [options.assignedUserId],
      actorId: user.id,
      type: "TASK_ASSIGNED",
      title: "Subtask Assigned",
      message: `${user.name} assigned you "${title}" on task "${task.title}"`,
      taskId,
    });
  } else if (options?.deptId) {
    const managers = await db.user.findMany({
      where: { departmentId: options.deptId, role: "MANAGER", isActive: true },
      select: { id: true },
    });
    await notifyTaskParties({
      userIds: managers.map((m) => m.id),
      actorId: user.id,
      type: "TASK_ASSIGNED",
      title: "Subtask Routed To Your Department",
      message: `${user.name} routed "${title}" under "${task.title}" to your department. Please assign it.`,
      taskId,
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  return subtask;
}

/**
 * Give a routed subtask an owner.
 *
 * Cross-department work used to be a title prefix that only the parent task's
 * assignee could tick off — so the person who owed the work could not close it,
 * and the person who could was not doing it.
 */
export async function setSubtaskAssignee(subtaskId: number, assignedUserId: number | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const subtask = await db.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: { select: { id: true, title: true, deptId: true, createdById: true, assignedUserId: true } } },
  });
  if (!subtask) throw new Error("Subtask not found");

  const isTaskInitiator = subtask.task.createdById === user.id;
  const isTaskAssignee = subtask.task.assignedUserId === user.id;
  const isPlatformAdmin = user.role === "ADMIN" || user.role === "CEO";
  // The manager of whichever department owns the work.
  const isOwningManager =
    user.role === "MANAGER" &&
    !!user.departmentId &&
    (user.departmentId === subtask.deptId || user.departmentId === subtask.task.deptId);

  if (!isTaskInitiator && !isTaskAssignee && !isPlatformAdmin && !isOwningManager) {
    throw new Error("Only the task's team or the owning department's manager can assign this");
  }

  if (assignedUserId) {
    const assignee = await db.user.findFirst({
      where: { id: assignedUserId, isActive: true },
      select: { id: true, departmentId: true },
    });
    if (!assignee) throw new Error("Assignee must be an active user");
  }

  const updated = await db.subtask.update({
    where: { id: subtaskId },
    data: {
      assignedUserId,
      // An unassigned subtask must not stay in a state nobody can be credited for.
      ...(assignedUserId ? {} : { status: "PENDING" as const }),
    },
  });

  if (subtask.checklistItemId) {
    await db.boardChecklistItem.update({
      where: { id: subtask.checklistItemId },
      data: { assignedUserId, ...(assignedUserId ? {} : { isDone: false }) },
    }).catch(() => {});
  }

  if (assignedUserId) {
    await notifyTaskParties({
      userIds: [assignedUserId],
      actorId: user.id,
      type: "TASK_ASSIGNED",
      title: "Subtask Assigned",
      message: `${user.name} assigned you "${subtask.title}" on task "${subtask.task.title}"`,
      taskId: subtask.taskId,
    });
  }

  revalidatePath(`/tasks/${subtask.taskId}`);
  return updated;
}

export async function updateSubtaskStatus(
  subtaskId: number,
  status: "PENDING" | "IN_PROGRESS" | "DONE"
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const subtask = await db.subtask.findUnique({
    where: { id: subtaskId },
    include: {
      task: {
        include: {
          project: { select: { title: true } },
        },
      },
    },
  });

  if (!subtask) throw new Error("Subtask not found");

  // The subtask's own assignee owns it; otherwise it falls to the parent task's
  // assignee. Routed work is completed by the department doing it.
  const owner = subtask.assignedUserId ?? subtask.task.assignedUserId;
  if (owner !== user.id) {
    throw new Error(
      subtask.assignedUserId
        ? "Only the person this subtask is assigned to can complete it"
        : "Unauthorized - Only the assignee can mark subtasks complete"
    );
  }

  const normalizedStatus = status === "DONE" ? "DONE" : "PENDING";
  const statusChangedToDone = subtask.status !== "DONE" && normalizedStatus === "DONE";

  const updated = await db.subtask.update({
    where: { id: subtaskId },
    data: { status: normalizedStatus },
  });

  if (subtask.checklistItemId) {
    await db.boardChecklistItem.update({
      where: { id: subtask.checklistItemId },
      data: { isDone: normalizedStatus === "DONE" },
    }).catch(() => {});
  }

  if (statusChangedToDone) {
    await db.activityLog.create({
      data: {
        type: "COMMENTED",
        description: "completed subtask",
        taskId: subtask.taskId,
        projectId: subtask.task.projectId,
        userId: user.id,
        metadata: JSON.stringify({
          kind: "DAILY_LOG",
          note: subtask.description?.trim() || subtask.title,
          markCompleted: true,
          taskTitle: subtask.title,
          parentTaskTitle: subtask.task.title,
          projectTitle: subtask.task.project.title,
          subtaskId: subtask.id,
          source: "SUBTASK_COMPLETION",
        }),
      },
    });
  }

  revalidatePath(`/tasks/${subtask.taskId}`);
  revalidatePath("/daily-log");
  revalidatePath("/reports");
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

  // Allow only the initiator (creator) to delete subtasks.
  if (subtask.task.createdById !== user.id) {
    throw new Error("Unauthorized - Only the task initiator can delete subtasks");
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
    userName: activity.user?.name || "Deleted User",
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

  if (file.size <= 0) {
    throw new Error("File is empty");
  }

  if (file.size > MAX_TASK_RESOURCE_SIZE_BYTES) {
    throw new Error("File too large. Max size is 10MB");
  }

  const rawExtension = extname(file.name).toLowerCase();
  if (!ALLOWED_TASK_RESOURCE_EXTENSIONS.has(rawExtension)) {
    throw new Error("File type not allowed");
  }

  if (file.type && !ALLOWED_TASK_RESOURCE_MIME_TYPES.has(file.type)) {
    throw new Error("File type not allowed");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const detectedType = detectFileSignature(buffer);
  const allowDocByExtension = rawExtension === ".doc" || rawExtension === ".docx";
  if (detectedType === "unknown" && !allowDocByExtension) {
    throw new Error("Unsupported or unsafe file content");
  }

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
    userName: activity.user?.name || "Deleted User",
    createdAt: activity.createdAt.toISOString(),
    metadata: activity.metadata,
  };
}

