import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  getCurrentUser,
  resolveLogAudience,
  allowedLogScopes,
  type LogScope,
} from "@/lib/permissions";
import {
  parseLogRange,
  resolveLogRange,
  logSourceFromMetadata,
  type LogSource,
} from "@/lib/dailyLog";
import DailyLogClient from "./DailyLogClient";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export const dynamic = "force-dynamic";

type SearchParams = {
  scope?: string;
  range?: string;
  member?: string;
};

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

function parseScope(value: string | undefined): LogScope {
  return value === "team" || value === "company" ? value : "personal";
}

export default async function DailyLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const requestedScope = parseScope(searchParams.scope);
  const range = parseLogRange(searchParams.range);

  // resolveLogAudience validates the scope against the viewer's role and
  // silently degrades to "personal" rather than trusting the query string.
  const { scope, members } = await resolveLogAudience(user, requestedScope);

  const memberIds = members.map((m) => m.id);
  const requestedMemberId = searchParams.member ? Number(searchParams.member) : null;
  const selectedMemberId =
    requestedMemberId && memberIds.includes(requestedMemberId) ? requestedMemberId : null;

  const audienceIds = selectedMemberId ? [selectedMemberId] : memberIds;

  const bounds = resolveLogRange(range);
  const dateFilter = bounds ? { createdAt: { gte: bounds.start, lt: bounds.end } } : {};

  // ---- Task picker options for the "Add Log" wizard (always the viewer's own)
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

  // ---- Log feeds -----------------------------------------------------------
  // 1. Everything written as a daily log: manual wizard entries, subtask
  //    completions, board card completions and board checklist completions.
  // 2. Task completions.
  // Board card *activity* (created/moved/commented) is deliberately excluded —
  // the log records finished work, not every board interaction.
  const [activityLogs, taskActivityLogs] = await Promise.all([
    db.activityLog.findMany({
      where: {
        userId: { in: audienceIds },
        type: "COMMENTED",
        metadata: { contains: '"kind":"DAILY_LOG"' },
        ...dateFilter,
      },
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    db.activityLog.findMany({
      where: {
        userId: { in: audienceIds },
        type: "COMPLETED",
        taskId: { not: null },
        ...dateFilter,
      },
      include: {
        user: { select: { id: true, name: true } },
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, title: true, client: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const wizardLogs = activityLogs
    .map((log) => {
      const metadata = parseDailyLogMetadata(log.metadata);
      if (!metadata) return null;

      return {
        key: `al-${log.id}`,
        loggedAt: log.createdAt.toISOString(),
        userId: log.user?.id ?? null,
        userName: log.user?.name ?? "Unknown",
        projectId: log.projectId,
        projectTitle: metadata.projectTitle || log.project?.title || "Daily Log",
        taskId: log.taskId,
        taskTitle: metadata.taskTitle || log.task?.title || "Daily Log",
        parentTaskTitle: metadata.parentTaskTitle || log.task?.title || "",
        note: metadata.note || "",
        markCompleted: Boolean(metadata.markCompleted),
        source: logSourceFromMetadata(metadata.source),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const taskLogs = taskActivityLogs
    .map((log) => {
      const task = log.task;
      if (!task) return null;
      return {
        key: `task-${log.id}`,
        loggedAt: log.createdAt.toISOString(),
        userId: log.user?.id ?? null,
        userName: log.user?.name ?? "Unknown",
        projectId: task.project?.id ?? null,
        projectTitle: task.project
          ? `${task.project.client?.name ?? ""} - ${task.project.title}`
          : "Task Activity",
        taskId: task.id,
        taskTitle: task.title,
        parentTaskTitle: "",
        note: log.description,
        markCompleted: true,
        source: "task" as LogSource,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const logs = [...wizardLogs, ...taskLogs].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
  );

  return (
    <>
      <RealtimeRefresh intervalMs={5000} />
      <DailyLogClient
        projects={Array.from(projectsMap.values())}
        initialLogs={logs}
        scope={scope}
        availableScopes={allowedLogScopes(user)}
        members={scope === "personal" ? [] : members}
        selectedMemberId={selectedMemberId}
        range={range}
        currentUserId={user.id}
      />
    </>
  );
}
