import { redirect } from "next/navigation";
import { getCurrentUser, canViewClients, canOnboardClient, canCloseClient } from "@/lib/permissions";
import { db } from "@/lib/db";
import ClientsClient from "./ClientsClient";

type SearchParams = {
  startDate?: string;
  endDate?: string;
  healthBucket?: string;
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewClients(user)) redirect("/dashboard");

  const startDate = params.startDate ? new Date(`${params.startDate}T00:00:00.000Z`) : null;
  const endDate = params.endDate ? new Date(`${params.endDate}T23:59:59.999Z`) : null;

  const clients = await db.client.findMany({
    include: {
      projects: {
        include: {
          tasks: {
            select: {
              status: true,
              completedAt: true,
              slaStartedAt: true,
              slaHours: true,
              slaPausedDuration: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const mappedClients = clients
    .map((c) => {
      const projectCount = c.projects.length;
      const taskCount = c.projects.reduce((sum, p) => sum + p.tasks.length, 0);
      const activeTasks = c.projects.reduce(
        (sum, p) => sum + p.tasks.filter((t) => !["DONE", "CANCELLED"].includes(t.status)).length,
        0
      );

      const trackedDoneTasks = c.projects.flatMap((project) =>
        project.tasks.filter((task) => {
          if (task.status !== "DONE" || !task.completedAt || !task.slaStartedAt || !task.slaHours) return false;
          if (startDate && task.completedAt < startDate) return false;
          if (endDate && task.completedAt > endDate) return false;
          return true;
        })
      );

      let health: "HEALTHY" | "AT_RISK" | "ONBOARDING" = "ONBOARDING";
      if (trackedDoneTasks.length > 0) {
        const metCount = trackedDoneTasks.filter((task) => {
          const elapsed = Math.max(
            0,
            task.completedAt!.getTime() - task.slaStartedAt!.getTime() - (task.slaPausedDuration || 0) * 1000
          );
          return elapsed <= task.slaHours! * 60 * 60 * 1000;
        }).length;
        const rate = (metCount / trackedDoneTasks.length) * 100;
        health = rate >= 85 ? "HEALTHY" : rate >= 60 ? "AT_RISK" : "ONBOARDING";
      } else if (taskCount > 0) {
        const completedTasks = c.projects.reduce(
          (sum, p) => sum + p.tasks.filter((t) => t.status === "DONE").length,
          0
        );
        const completionRate = taskCount > 0 ? completedTasks / taskCount : 0;
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
    })
    .filter((client) => {
      if (!params.healthBucket) return true;
      if (params.healthBucket === "healthy") return client.health === "HEALTHY";
      if (params.healthBucket === "monitoring") return client.health === "AT_RISK";
      if (params.healthBucket === "critical") return client.health === "ONBOARDING";
      return true;
    });

  return (
    <ClientsClient
      initialClients={mappedClients}
      canCreate={canOnboardClient(user)}
      canClose={canCloseClient(user)}
    />
  );
}
