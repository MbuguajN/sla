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
  const now = new Date();

  let totalOverdue = 0;
  const projects = client.projects.map((project) => {
    const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
    const overdueCount = project.tasks.filter((t) => {
      if (["DONE", "CANCELLED"].includes(t.status)) return false;
      if (!t.slaStartedAt || !t.slaHours) return false;
      const paused = t.slaPausedDuration ?? 0;
      const deadlineMs =
        new Date(t.slaStartedAt).getTime() + (t.slaHours * 3600 - paused) * 1000;
      return deadlineMs < now.getTime();
    }).length;
    totalOverdue += overdueCount;

    return {
      id: project.id,
      title: project.title,
      status: project.status as string,
      taskCount: project._count.tasks,
      doneCount,
      overdueCount,
      departments: project.departments.map((d) => d.department.name),
      year: new Date(project.createdAt).getFullYear().toString(),
    };
  });

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
      projects={projects}
      totalOverdue={totalOverdue}
      canAddProject={canAddProject}
    />
  );
}
