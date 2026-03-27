import { redirect } from "next/navigation";
import { getCurrentUser, canCreateTask } from "@/lib/permissions";
import { db } from "@/lib/db";
import NewTaskClient from "./NewTaskClient";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canCreateTask(user)) redirect("/dashboard");

  // Get projects for dropdown
  const projects = await db.project.findMany({
    where: { status: "ACTIVE" },
    include: {
      client: true,
      departments: {
        include: { department: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get all departments for task assignment
  const departments = await db.department.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <NewTaskClient
      projects={projects.map((p) => ({
        id: p.id,
        title: p.title,
        clientId: p.client.id,
        clientName: p.client.name,
        departments: p.departments.map((pd) => ({
          id: pd.department.id,
          name: pd.department.name,
          slaHours: pd.slaHours,
        })),
      }))}
      allDepartments={departments.map((d) => ({
        id: d.id,
        name: d.name,
      }))}
      preselectedProjectId={params.projectId ? parseInt(params.projectId) : undefined}
    />
  );
}
