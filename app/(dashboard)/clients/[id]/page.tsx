import { redirect, notFound } from "next/navigation";
import { getCurrentUser, canViewClients, canCreateProject } from "@/lib/permissions";
import { db } from "@/lib/db";
import ClientDetailClient from "./ClientDetailClient";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewClients(user)) redirect("/dashboard");

  const client = await db.client.findUnique({
    where: { id: parseInt(id) },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
      },
      projects: {
        include: {
          departments: {
            include: { department: { select: { name: true } } },
          },
          tasks: {
            select: {
              status: true,
              slaStartedAt: true,
              slaHours: true,
              slaPausedDuration: true,
              completedAt: true,
            },
          },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const canAddProject = canCreateProject(user) && client.status === "ACTIVE";

  const documents = client.documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    url: doc.url,
  }));

  const now = new Date();

  let totalTasks = 0;
  let totalDone = 0;
  let totalMissedSla = 0;
  let totalCompletedWithinSla = 0;

  const activeCompletionRates: number[] = [];

  const projects = client.projects.map((project) => {
    const taskCount = project._count.tasks;
    const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
    const completionRate = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

    if (project.status === "ACTIVE") {
      activeCompletionRates.push(completionRate);
    }

    const { missedCount, completedWithinSlaCount } = project.tasks.reduce(
      (acc, task) => {
        if (!task.slaStartedAt || !task.slaHours) return acc;

        const paused = task.slaPausedDuration ?? 0;
        const deadlineMs =
          new Date(task.slaStartedAt).getTime() + (task.slaHours * 3600 - paused) * 1000;

        if (task.status === "DONE") {
          if (task.completedAt && task.completedAt.getTime() <= deadlineMs) {
            acc.completedWithinSlaCount += 1;
          } else {
            acc.missedCount += 1;
          }
          return acc;
        }

        if (!["DONE", "CANCELLED"].includes(task.status) && deadlineMs < now.getTime()) {
          acc.missedCount += 1;
        }

        return acc;
      },
      { missedCount: 0, completedWithinSlaCount: 0 }
    );

    totalTasks += taskCount;
    totalDone += doneCount;
    totalMissedSla += missedCount;
    totalCompletedWithinSla += completedWithinSlaCount;

    return {
      id: project.id,
      title: project.title,
      status: project.status as string,
      taskCount,
      doneCount,
      overdueCount: missedCount,
      departments: project.departments.map((d) => d.department.name),
      year: new Date(project.createdAt).getFullYear().toString(),
      createdAt: project.createdAt.toISOString(),
    };
  });

  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const overallCompletionRate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;
  const activeProjectsCompletion =
    activeCompletionRates.length > 0
      ? Math.round(activeCompletionRates.reduce((sum, value) => sum + value, 0) / activeCompletionRates.length)
      : 0;

  const hasProjects = projects.length > 0;
  const slaEvaluatedTotal = totalCompletedWithinSla + totalMissedSla;
  const clientHealth =
    !hasProjects || slaEvaluatedTotal === 0
      ? 0
      : Math.round((totalCompletedWithinSla / slaEvaluatedTotal) * 100);

  return (
    <ClientDetailClient
      client={{
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        contactName: client.contactName,
        description: client.description,
        status: client.status as string,
      }}
      documents={documents}
      projects={projects}
      metrics={{
        activeProjects,
        overallCompletionRate,
        activeProjectsCompletion,
        clientHealth,
        totalCompletedWithinSla,
        totalMissedSla,
      }}
      canAddProject={canAddProject}
    />
  );
}
