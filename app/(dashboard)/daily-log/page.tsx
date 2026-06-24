import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import DailyLogClient from "./DailyLogClient";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export const dynamic = "force-dynamic";

type DailyLogMetadata = {
  kind?: string;
  note?: string;
  markCompleted?: boolean;
  taskTitle?: string;
  parentTaskTitle?: string;
  projectTitle?: string;
  subtaskId?: number;
  source?: string;
};

function parseDailyLogMetadata(raw: string | null): DailyLogMetadata | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DailyLogMetadata;
    if (parsed.kind !== "DAILY_LOG") return null;
    return parsed;
  } catch {
    return null;
  }
}

export default async function DailyLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasGlobalTaskAccess =
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    user.departmentSlug === "client-service" ||
    user.departmentSlug === "business-development" ||
    user.departmentSlug === "finance";

  const tasks = await db.task.findMany({
    where: hasGlobalTaskAccess
      ? { status: { not: "CANCELLED" } }
      : {
          AND: [
            { status: { not: "CANCELLED" } },
            {
              OR: [
                { assignedUserId: user.id },
                { createdById: user.id },
                ...(user.departmentId ? [{ deptId: user.departmentId }] : []),
              ],
            },
          ],
        },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          client: { select: { name: true } },
        },
      },
    },
    orderBy: [{ projectId: "asc" }, { title: "asc" }],
  });

  const projectsMap = new Map<
    number,
    { id: number; title: string; clientName: string; tasks: { id: number; title: string; status: string }[] }
  >();

  for (const task of tasks) {
    if (!projectsMap.has(task.project.id)) {
      projectsMap.set(task.project.id, {
        id: task.project.id,
        title: task.project.title,
        clientName: task.project.client.name,
        tasks: [],
      });
    }

    projectsMap.get(task.project.id)!.tasks.push({
      id: task.id,
      title: task.title,
      status: task.status,
    });
  }

  const activityLogs = await db.activityLog.findMany({
    where: {
      userId: user.id,
      type: "COMMENTED",
      metadata: { contains: '"kind":"DAILY_LOG"' },
    },
    include: {
      task: { select: { id: true, title: true } },
      project: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const logs = activityLogs
    .map((log) => {
      const metadata = parseDailyLogMetadata(log.metadata);
      if (!metadata) return null;

      return {
        id: log.id,
        loggedAt: log.createdAt.toISOString(),
        projectId: log.projectId,
        projectTitle: metadata.projectTitle || log.project?.title || "Daily Log",
        taskId: log.taskId,
        taskTitle: metadata.taskTitle || log.task?.title || "Daily Log",
        parentTaskTitle: metadata.parentTaskTitle || log.task?.title || "",
        note: metadata.note || "",
        markCompleted: Boolean(metadata.markCompleted),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return (
    <>
      <RealtimeRefresh intervalMs={5000} />
      <DailyLogClient
        projects={Array.from(projectsMap.values())}
        initialLogs={logs}
      />
    </>
  );
}
