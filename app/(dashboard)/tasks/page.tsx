import { redirect } from "next/navigation";
import { getCurrentUser, canCreateTask } from "@/lib/permissions";
import { db } from "@/lib/db";
import TasksClient from "./TasksClient";
import { processLeaveTaskHandovers } from "@/app/actions/leaveHandoverActions";

type SearchParams = {
  startDate?: string;
  endDate?: string;
  department?: string;
  clientId?: string;
  reportView?: string;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await processLeaveTaskHandovers();

  const filters = {
    ...(params.department ? { assignedDepartment: { is: { name: params.department } } } : {}),
    ...(params.clientId ? { project: { is: { clientId: parseInt(params.clientId, 10) } } } : {}),
    ...(params.startDate || params.endDate
      ? {
          status: "DONE" as const,
          completedAt: {
            ...(params.startDate ? { gte: new Date(`${params.startDate}T00:00:00.000Z`) } : {}),
            ...(params.endDate ? { lte: new Date(`${params.endDate}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  let tasks;
  const hasGlobalTaskAccess =
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    user.departmentSlug === "client-service" ||
    user.departmentSlug === "business-development";

  if (hasGlobalTaskAccess) {
    tasks = await db.task.findMany({
      where: filters,
      include: {
        project: { include: { client: true } },
        assignedTo: true,
        assignedDepartment: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (user.role === "MANAGER" && user.departmentId) {
    tasks = await db.task.findMany({
      where: {
        AND: [{ deptId: user.departmentId }, filters],
      },
      include: {
        project: { include: { client: true } },
        assignedTo: true,
        assignedDepartment: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    tasks = await db.task.findMany({
      where: {
        AND: [{ OR: [{ assignedUserId: user.id }, { createdById: user.id }] }, filters],
      },
      include: {
        project: { include: { client: true } },
        assignedTo: true,
        assignedDepartment: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <TasksClient
      initialTasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectId: t.projectId,
        projectTitle: t.project.title,
        clientName: t.project.client.name,
        departmentName: t.assignedDepartment?.name || null,
        assigneeName: t.assignedTo?.name || null,
        creatorName: t.createdBy.name,
        slaHours: t.slaHours,
        slaStartedAt: t.slaStartedAt?.toISOString() || null,
        slaPausedAt: t.slaPausedAt?.toISOString() || null,
        slaPausedDuration: t.slaPausedDuration,
        createdAt: t.createdAt.toISOString(),
      }))}
      canCreate={canCreateTask(user)}
      userRole={user.role}
      userDepartmentSlug={user.departmentSlug}
    />
  );
}
