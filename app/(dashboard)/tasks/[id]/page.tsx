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
      subtasks: {
        orderBy: { createdAt: "asc" },
        include: {
          department: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      },
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
  let departmentMembers: { id: number; name: string; role: string; departmentId: number | null }[] = [];
  if (user.role === "MANAGER" && user.departmentId === task.deptId && task.deptId) {
    const members = await db.user.findMany({
      where: {
        departmentId: task.deptId,
        isActive: true,
      },
      select: { id: true, name: true, role: true, departmentId: true },
      orderBy: { name: "asc" },
    });
    departmentMembers = members;
  } else if (user.role === "CEO" || user.role === "ADMIN") {
    const members = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true, departmentId: true },
      orderBy: { name: "asc" },
    });
    departmentMembers = members;
  }

  // Anyone who could own a routed subtask: the task's own department plus every
  // department a subtask was routed to.
  const subtaskDeptIds = [
    ...new Set(task.subtasks.map((s) => s.deptId).filter((id): id is number => !!id)),
  ];
  const subtaskAssignees = subtaskDeptIds.length
    ? await db.user.findMany({
        where: { departmentId: { in: subtaskDeptIds }, isActive: true },
        select: { id: true, name: true, departmentId: true },
        orderBy: { name: "asc" },
      })
    : [];

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
        creatorDepartmentId: task.createdBy?.departmentId ?? null,
        creatorName: task.createdBy?.name || "Deleted User",
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
          deptId: s.deptId,
          departmentName: s.department?.name || null,
          assignedUserId: s.assignedUserId,
          assigneeName: s.assignedTo?.name || null,
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
          userName: a.user?.name || "Deleted User",
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
      subtaskAssignees={subtaskAssignees}
    />
  );
}
