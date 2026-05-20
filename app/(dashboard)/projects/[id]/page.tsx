import { redirect, notFound } from "next/navigation";
import { canAccessProject, canCreateProject, canCreateTask, canManageProjectStatus, getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import ProjectDetailClient from "./ProjectDetailClient";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = parseInt(id, 10);
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (Number.isNaN(projectId)) notFound();

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      briefLinks: true,
      departments: { include: { department: true }, orderBy: { createdAt: "asc" } },
      tasks: {
        include: {
          assignedTo: true,
          assignedDepartment: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) notFound();

  const hasAccess = await canAccessProject(user, project.id);
  if (!hasAccess) redirect("/dashboard");

  const departments = await db.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const canManageBriefLinks = canCreateProject(user);

  return (
    <ProjectDetailClient
      project={project}
      departments={departments}
      canAddTask={canCreateTask(user)}
      canManageDepartments={canCreateProject(user)}
      canManageStatus={canManageProjectStatus(user)}
      canManageBriefLinks={canManageBriefLinks}
    />
  );
}