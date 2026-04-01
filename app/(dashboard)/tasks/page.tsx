import { redirect } from "next/navigation";
import { getCurrentUser, canCreateTask } from "@/lib/permissions";
import { db } from "@/lib/db";
import TasksClient from "./TasksClient";
import { processLeaveTaskHandovers } from "@/app/actions/leaveHandoverActions";

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await processLeaveTaskHandovers();

  // Fetch tasks based on user role
  let tasks;
  if (user.role === "ADMIN" || user.role === "CEO") {
    tasks = await db.task.findMany({
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
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    tasks = await db.task.findMany({
      where: {
        OR: [{ assignedUserId: user.id }, { createdById: user.id }],
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
    />
  );
}
