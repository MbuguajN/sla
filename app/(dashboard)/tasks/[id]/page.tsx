import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import TaskDetailClient from "./TaskDetailClient";
import { processLeaveTaskHandovers } from "@/app/actions/leaveHandoverActions";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await processLeaveTaskHandovers();

  const task = await db.task.findUnique({
    where: { id: parseInt(id) },
    include: {
      project: { include: { client: true } },
      assignedTo: true,
      assignedDepartment: true,
      createdBy: true,
      subtasks: { orderBy: { createdAt: "asc" } },
      links: { orderBy: { createdAt: "asc" } },
      activityLog: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!task) {
    notFound();
  }

  // Check access
  const canAccess =
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    task.createdById === user.id ||
    task.assignedUserId === user.id ||
    task.deptId === user.departmentId;

  if (!canAccess) {
    redirect("/dashboard");
  }

  // Get department members for assignment (if manager)
  let departmentMembers: { id: number; name: string }[] = [];
  if (user.role === "MANAGER" && user.departmentId === task.deptId && task.deptId) {
    const members = await db.user.findMany({
      where: {
        departmentId: task.deptId,
        isActive: true,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    departmentMembers = members;
  }

  return (
    <TaskDetailClient
      task={{
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        briefReceivedAt: task.briefReceivedAt?.toISOString() || null,
        briefCategory: task.briefCategory || null,
        projectId: task.projectId,
        projectTitle: task.project.title,
        clientName: task.project.client.name,
        deptId: task.deptId,
        departmentName: task.assignedDepartment?.name || null,
        assignedUserId: task.assignedUserId,
        assigneeName: task.assignedTo?.name || null,
        createdById: task.createdById,
        creatorName: task.createdBy.name,
        slaHours: task.slaHours,
        slaStartedAt: task.slaStartedAt?.toISOString() || null,
        slaPausedAt: task.slaPausedAt?.toISOString() || null,
        slaPausedDuration: task.slaPausedDuration,
        confirmedAt: task.confirmedAt?.toISOString() || null,
        submittedAt: task.submittedAt?.toISOString() || null,
        completedAt: task.completedAt?.toISOString() || null,
        createdAt: task.createdAt.toISOString(),
        subtasks: task.subtasks.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          status: s.status,
        })),
        links: task.links.map((l) => ({
          id: l.id,
          name: l.name,
          url: l.url,
        })),
        activityLog: task.activityLog.map((a) => ({
          id: a.id,
          type: a.type,
          description: a.description,
          userName: a.user.name,
          createdAt: a.createdAt.toISOString(),
          metadata: a.metadata,
        })),
      }}
      currentUser={{
        id: user.id,
        role: user.role,
        departmentId: user.departmentId,
        departmentSlug: user.departmentSlug,
      }}
      departmentMembers={departmentMembers}
    />
  );
}
