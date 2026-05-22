import { redirect } from "next/navigation";
import { getCurrentUser, canCreateTask } from "@/lib/permissions";
import { db } from "@/lib/db";
import TasksClient from "./TasksClient";
import { processLeaveTaskHandovers } from "@/app/actions/leaveHandoverActions";
import RealtimeRefresh from "@/components/RealtimeRefresh";

type SearchParams = {
  startDate?: string;
  endDate?: string;
  department?: string;
  clientId?: string;
  reportView?: string;
};

function toRangeBounds(startDate?: string, endDate?: string) {
  return {
    ...(startDate ? { gte: new Date(`${startDate}T00:00:00.000Z`) } : {}),
    ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
  };
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await processLeaveTaskHandovers();

  const completedRange = toRangeBounds(params.startDate, params.endDate);

  const filters = {
    ...(params.department ? { assignedDepartment: { is: { name: params.department } } } : {}),
    ...(params.clientId ? { project: { is: { clientId: parseInt(params.clientId, 10) } } } : {}),
    ...(params.startDate || params.endDate
      ? {
          status: "DONE" as const,
          completedAt: completedRange,
        }
      : {}),
  };

  let tasks;
  let completedSubtasks: Array<{
    id: number;
    title: string;
    updatedAt: Date;
    task: {
      id: number;
      status: string;
      priority: string;
      projectId: number;
      project: { title: string; client: { name: string } };
      assignedTo: { name: string } | null;
      assignedDepartment: { name: string } | null;
      createdBy: { name: string };
    };
  }> = [];
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

    completedSubtasks = await db.subtask.findMany({
      where: {
        status: "DONE",
        ...(params.startDate || params.endDate ? { updatedAt: completedRange } : {}),
        task: {
          status: { not: "CANCELLED" },
          ...(params.department ? { assignedDepartment: { is: { name: params.department } } } : {}),
          ...(params.clientId ? { project: { is: { clientId: parseInt(params.clientId, 10) } } } : {}),
        },
      },
      include: {
        task: {
          include: {
            project: { include: { client: true } },
            assignedTo: true,
            assignedDepartment: true,
            createdBy: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
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

    completedSubtasks = await db.subtask.findMany({
      where: {
        status: "DONE",
        ...(params.startDate || params.endDate ? { updatedAt: completedRange } : {}),
        task: {
          deptId: user.departmentId,
          status: { not: "CANCELLED" },
          ...(params.department ? { assignedDepartment: { is: { name: params.department } } } : {}),
          ...(params.clientId ? { project: { is: { clientId: parseInt(params.clientId, 10) } } } : {}),
        },
      },
      include: {
        task: {
          include: {
            project: { include: { client: true } },
            assignedTo: true,
            assignedDepartment: true,
            createdBy: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
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

    completedSubtasks = await db.subtask.findMany({
      where: {
        status: "DONE",
        ...(params.startDate || params.endDate ? { updatedAt: completedRange } : {}),
        task: {
          status: { not: "CANCELLED" },
          OR: [{ assignedUserId: user.id }, { createdById: user.id }],
          ...(params.department ? { assignedDepartment: { is: { name: params.department } } } : {}),
          ...(params.clientId ? { project: { is: { clientId: parseInt(params.clientId, 10) } } } : {}),
        },
      },
      include: {
        task: {
          include: {
            project: { include: { client: true } },
            assignedTo: true,
            assignedDepartment: true,
            createdBy: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  const subtaskRows = completedSubtasks.map((subtask) => ({
    id: -subtask.id,
    routeTaskId: subtask.task.id,
    title: `Subtask: ${subtask.title}`,
    status: "DONE",
    priority: subtask.task.priority,
    projectId: subtask.task.projectId,
    projectTitle: subtask.task.project.title,
    clientName: subtask.task.project.client.name,
    departmentName: subtask.task.assignedDepartment?.name || null,
    assigneeName: subtask.task.assignedTo?.name || null,
    creatorName: subtask.task.createdBy.name,
    slaHours: null,
    slaStartedAt: null,
    slaPausedAt: null,
    slaPausedDuration: 0,
    createdAt: subtask.updatedAt.toISOString(),
    isSubtaskCompletion: true,
  }));

  const taskRows = tasks.map((t) => ({
    id: t.id,
    routeTaskId: t.id,
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
    isSubtaskCompletion: false,
  }));

  return (
    <>
      <RealtimeRefresh intervalMs={5000} />
      <TasksClient
        initialTasks={[...taskRows, ...subtaskRows]}
        canCreate={canCreateTask(user)}
        userRole={user.role}
        userDepartmentSlug={user.departmentSlug}
      />
    </>
  );
}
