import { redirect } from "next/navigation";
import { getCurrentUser, canCreateProject, canViewAllProjects } from "@/lib/permissions";
import { db } from "@/lib/db";
import ProjectsClient from "./ProjectsClient";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch projects based on user role
  let projectsRaw;
  if (canViewAllProjects(user)) {
    projectsRaw = await db.project.findMany({
      include: {
        client: true,
        departments: { include: { department: true } },
        tasks: {
          select: { status: true, slaStartedAt: true, slaHours: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (user.departmentId) {
    projectsRaw = await db.project.findMany({
      where: {
        OR: [
          { departments: { some: { departmentId: user.departmentId } } },
          { createdBy: user.id },
        ],
      },
      include: {
        client: true,
        departments: { include: { department: true } },
        tasks: {
          select: { status: true, slaStartedAt: true, slaHours: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    projectsRaw = await db.project.findMany({
      where: { createdBy: user.id },
      include: {
        client: true,
        departments: { include: { department: true } },
        tasks: {
          select: { status: true, slaStartedAt: true, slaHours: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <ProjectsClient
      initialProjects={projectsRaw.map((p) => {
        const now = new Date();
        const totalTasks = p.tasks.length;
        const closedTasks = p.tasks.filter(t => t.status === 'DONE').length;
        const progress = totalTasks > 0 ? Math.round((closedTasks / totalTasks) * 100) : 0;
        const hasOverdue = p.tasks.some(t =>
          !['DONE', 'CANCELLED'].includes(t.status) &&
          t.slaStartedAt != null && t.slaHours != null &&
          (new Date(t.slaStartedAt).getTime() + t.slaHours * 3600000 < now.getTime())
        );

        return {
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          clientId: p.clientId,
          clientName: p.client.name,
          departments: p.departments.map((pd) => pd.department.name),
          taskCount: totalTasks,
          closedTaskCount: closedTasks,
          progress: progress,
          hasOverdue: hasOverdue,
          createdAt: p.createdAt.toISOString(),
        }
      })}
      canCreate={canCreateProject(user)}
    />
  );
}
