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
          select: { status: true }
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
          select: { status: true }
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
          select: { status: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <ProjectsClient
      initialProjects={projectsRaw.map((p) => {
        const totalTasks = p.tasks.length;
        const closedTasks = p.tasks.filter(t => t.status === 'COMPLETED').length;
        const progress = totalTasks > 0 ? Math.round((closedTasks / totalTasks) * 100) : 0;

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
          createdAt: p.createdAt.toISOString(),
        }
      })}
      canCreate={canCreateProject(user)}
    />
  );
}
