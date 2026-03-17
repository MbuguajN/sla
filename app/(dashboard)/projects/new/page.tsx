import { redirect } from "next/navigation";
import { getCurrentUser, canCreateProject } from "@/lib/permissions";
import { db } from "@/lib/db";
import NewProjectClient from "./NewProjectClient";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canCreateProject(user)) redirect("/dashboard");

  const [clients, departments] = await Promise.all([
    db.client.findMany({
      orderBy: { name: "asc" },
    }),
    db.department.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <NewProjectClient
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      departments={departments.map((d) => ({ id: d.id, name: d.name, slug: d.slug }))}
      preselectedClientId={params.clientId ? parseInt(params.clientId) : undefined}
    />
  );
}
