"use server";

import { db } from "@/lib/db";
import {
  getCurrentUser,
  canCreateProject,
  canAccessProject,
  canViewAllProjects,
  canManageProjectStatus,
  DEPARTMENTS,
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function getProjects() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // If CEO or Admin, return all projects
  if (canViewAllProjects(user)) {
    return db.project.findMany({
      include: {
        client: true,
        departments: { include: { department: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // If user has department, return projects their department is involved in
  if (user.departmentId) {
    return db.project.findMany({
      where: {
        OR: [
          { departments: { some: { departmentId: user.departmentId } } },
          { createdBy: user.id },
        ],
      },
      include: {
        client: true,
        departments: { include: { department: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Return only projects created by user
  return db.project.findMany({
    where: { createdBy: user.id },
    include: {
      client: true,
      departments: { include: { department: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(projectId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const hasAccess = await canAccessProject(user, projectId);
  if (!hasAccess) throw new Error("Unauthorized");

  return db.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      briefLinks: true,
      departments: { include: { department: true } },
      tasks: {
        include: {
          assignedTo: true,
          assignedDepartment: true,
          subtasks: true,
        },
        orderBy: { createdAt: "desc" },
      },
      activityLog: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function createProject(data: {
  clientId: number;
  title: string;
  description?: string;
  briefLinkName?: string;
  briefLinkUrl?: string;
  departmentIds: number[];
  slaHours?: number;
}) {
  const user = await getCurrentUser();
  if (!user || !canCreateProject(user)) {
    throw new Error("Unauthorized - Only Client Service and Business Development can create projects");
  }

  // Check if client is closed
  const client = await db.client.findUnique({
    where: { id: data.clientId },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  if (client.status === "CLOSED") {
    throw new Error("Cannot create projects for closed clients");
  }

  const project = await db.project.create({
    data: {
      clientId: data.clientId,
      title: data.title,
      description: data.description || null,
      briefLink: null,
      ...(data.briefLinkName?.trim() && data.briefLinkUrl?.trim()
        ? {
            briefLinks: {
              create: {
                name: data.briefLinkName.trim(),
                url: /^https?:\/\//i.test(data.briefLinkUrl.trim())
                  ? data.briefLinkUrl.trim()
                  : `https://${data.briefLinkUrl.trim()}`,
              },
            },
          }
        : {}),
      createdBy: user.id,
      departments: {
        create: data.departmentIds.map((deptId) => ({
          departmentId: deptId,
          slaHours: data.slaHours || 48,
        })),
      },
    },
    include: {
      client: true,
      departments: { include: { department: true } },
    },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      type: "CREATED",
      description: `Project "${project.title}" created`,
      projectId: project.id,
      userId: user.id,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/clients/${data.clientId}`);
  return project;
}

export async function updateProject(
  projectId: number,
  data: {
    title?: string;
    description?: string;
    status?: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  }
) {
  const user = await getCurrentUser();
  if (!user || !canCreateProject(user)) {
    throw new Error("Unauthorized");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      title: data.title,
      description: data.description,
      status: data.status,
    },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: `Project updated`,
      projectId: project.id,
      userId: user.id,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return project;
}

export async function addProjectBriefLink(projectId: number, name: string, url: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const canManageBriefLinks = canCreateProject(user);

  if (!canManageBriefLinks) {
    throw new Error("Unauthorized - Only Business Development and Client Service can add brief links");
  }

  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  if (!trimmedName) throw new Error("Link name is required");
  if (!trimmedUrl) throw new Error("Link URL is required");

  const normalized = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

  const parsed = new URL(normalized);
  if (!parsed.hostname) throw new Error("Invalid URL");

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true },
  });

  if (!project) throw new Error("Project not found");

  await db.projectLink.create({
    data: {
      projectId,
      name: trimmedName,
      url: normalized,
    },
  });

  await db.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: "Project brief link added",
      projectId,
      userId: user.id,
      metadata: JSON.stringify({ name: trimmedName, url: normalized }),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProjectBriefLink(projectId: number, linkId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const canManageBriefLinks = canCreateProject(user);

  if (!canManageBriefLinks) {
    throw new Error("Unauthorized - Only Business Development and Client Service can delete brief links");
  }

  const link = await db.projectLink.findUnique({
    where: { id: linkId },
    select: { id: true, projectId: true, name: true, url: true },
  });

  if (!link || link.projectId !== projectId) {
    throw new Error("Brief link not found");
  }

  await db.projectLink.delete({ where: { id: linkId } });

  await db.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: "Project brief link removed",
      projectId,
      userId: user.id,
      metadata: JSON.stringify({ name: link.name, url: link.url }),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function addDepartmentToProject(projectId: number, departmentId: number, slaHours: number = 48) {
  const user = await getCurrentUser();
  if (!user || !canCreateProject(user)) {
    throw new Error("Unauthorized");
  }

  // Check if department is already assigned
  const existing = await db.projectDepartment.findUnique({
    where: {
      projectId_departmentId: { projectId, departmentId },
    },
  });

  if (existing) {
    throw new Error("Department already assigned to project");
  }

  await db.projectDepartment.create({
    data: {
      projectId,
      departmentId,
      slaHours,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function removeDepartmentFromProject(projectId: number, departmentId: number) {
  const user = await getCurrentUser();
  if (!user || !canCreateProject(user)) {
    throw new Error("Unauthorized");
  }

  await db.projectDepartment.delete({
    where: {
      projectId_departmentId: { projectId, departmentId },
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function closeProject(projectId: number) {
  const user = await getCurrentUser();
  if (!user || !canManageProjectStatus(user)) {
    throw new Error("Unauthorized - Only Business Development and Client Service can close projects");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      status: "COMPLETED",
    },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: `Project closed/completed`,
      projectId: project.id,
      userId: user.id,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return project;
}

export async function pauseProject(projectId: number) {
  const user = await getCurrentUser();
  if (!user || !canManageProjectStatus(user)) {
    throw new Error("Unauthorized - Only Business Development and Client Service can pause projects");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      status: "ON_HOLD",
    },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: `Project paused/on hold`,
      projectId: project.id,
      userId: user.id,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return project;
}

export async function resumeProject(projectId: number) {
  const user = await getCurrentUser();
  if (!user || !canManageProjectStatus(user)) {
    throw new Error("Unauthorized - Only Business Development and Client Service can resume projects");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      status: "ACTIVE",
    },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: `Project resumed`,
      projectId: project.id,
      userId: user.id,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return project;
}
