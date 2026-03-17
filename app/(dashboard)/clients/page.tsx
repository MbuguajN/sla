import { redirect } from "next/navigation";
import { getCurrentUser, canViewClients } from "@/lib/permissions";
import { db } from "@/lib/db";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewClients(user)) redirect("/dashboard");

  const clients = await db.client.findMany({
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ClientsClient
      initialClients={clients.map((c) => ({
        id: c.id,
        name: c.name,
        contactName: c.contactName,
        email: c.email,
        phone: c.phone,
        description: c.description,
        projectCount: c._count.projects,
        createdAt: c.createdAt.toISOString(),
      }))}
      canCreate={user.departmentSlug === "business-development" || user.role === "ADMIN" || user.role === "CEO"}
    />
  );
}
