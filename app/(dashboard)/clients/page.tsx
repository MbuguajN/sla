import { redirect } from "next/navigation";
import { getCurrentUser, canViewClients, canOnboardClient, canCloseClient } from "@/lib/permissions";
import { db } from "@/lib/db";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewClients(user)) redirect("/dashboard");

  const clients = await db.client.findMany({
    include: {
      projects: {
        include: {
          tasks: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ClientsClient
      initialClients={clients.map((c) => {
        const projectCount = c.projects.length;
        const taskCount = c.projects.reduce((sum, p) => sum + p.tasks.length, 0);
        const activeTasks = c.projects.reduce(
          (sum, p) => sum + p.tasks.filter((t) => !["DONE", "CANCELLED"].includes(t.status)).length,
          0
        );
        const completedTasks = c.projects.reduce(
          (sum, p) => sum + p.tasks.filter((t) => t.status === "DONE").length,
          0
        );
        // Derive health status
        let health: "HEALTHY" | "AT_RISK" | "ONBOARDING" = "ONBOARDING";
        if (taskCount > 0) {
          const completionRate = completedTasks / taskCount;
          health = completionRate >= 0.5 || activeTasks > 0 ? "HEALTHY" : "AT_RISK";
        }

        return {
          id: c.id,
          name: c.name,
          contactName: c.contactName,
          email: c.email,
          phone: c.phone,
          description: c.description,
          status: c.status as "ACTIVE" | "CLOSED",
          projectCount,
          taskCount,
          activeTasks,
          health,
          createdAt: c.createdAt.toISOString(),
        };
      })}
      canCreate={canOnboardClient(user)}
      canClose={canCloseClient(user)}
    />
  );
}
