import { redirect, notFound } from "next/navigation";
import { getCurrentUser, canAccessProject, canCreateTask } from "@/lib/permissions";
import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";

function formatRemaining(task: {
  status: string;
  slaHours: number | null;
  slaStartedAt: Date | null;
  slaPausedAt: Date | null;
  slaPausedDuration: number | null;
}) {
  if (!task.slaHours || !task.slaStartedAt) return "-";
  if (task.status === "DONE" || task.status === "CANCELLED") return "-";

  const now = new Date().getTime();
  const started = new Date(task.slaStartedAt).getTime();
  const totalMs = task.slaHours * 60 * 60 * 1000;
  const pausedMs = (task.slaPausedDuration || 0) * 1000;

  let elapsed = now - started - pausedMs;
  if (task.slaPausedAt) {
    elapsed = new Date(task.slaPausedAt).getTime() - started - pausedMs;
  }

  const remaining = totalMs - elapsed;
  if (remaining <= 0) return "0h";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h`;
  return `${Math.max(1, minutes)}m`;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function statusDotClass(status: string) {
  switch (status) {
    case "DONE":
      return "bg-emerald-500";
    case "IN_PROGRESS":
      return "bg-indigo-500";
    case "SUBMITTED":
      return "bg-rose-500";
    case "PAUSED":
      return "bg-amber-500";
    case "CONFIRMED":
      return "bg-sky-500";
    case "ASSIGNED":
      return "bg-violet-500";
    default:
      return "bg-gray-400";
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await db.project.findUnique({
    where: { id: parseInt(id) },
    include: {
      client: true,
      departments: { include: { department: true } },
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

  const canAddTask = canCreateTask(user);

  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.status === "DONE").length;
  const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const now = new Date();
  const hasOverdue = project.tasks.some(
    (t) =>
      !["DONE", "CANCELLED"].includes(t.status) &&
      t.slaStartedAt != null &&
      t.slaHours != null &&
      new Date(t.slaStartedAt).getTime() + t.slaHours * 3600000 < now.getTime()
  );

  const completionBarColor =
    completion === 100
      ? "bg-green-500"
      : hasOverdue
      ? "bg-red-500"
      : "bg-yellow-400";
  const completionTextColor =
    completion === 100 ? "text-green-600" : hasOverdue ? "text-red-600" : "text-yellow-600";

  const dueDate = project.tasks
    .filter((t) => t.submittedAt)
    .map((t) => new Date(t.submittedAt as Date))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const priorityOrder: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const topPriority = project.tasks
    .map((t) => t.priority)
    .sort((a, b) => (priorityOrder[b] || 0) - (priorityOrder[a] || 0))[0] || "MEDIUM";

  return (
    <div className="space-y-0 -mx-8 -mt-8">
      <section className="bg-white px-8 py-7 lg:px-10 lg:py-8 border-b border-[#e7eaf2]">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.16em]">
            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-1 text-[8px] text-rose-600">Active</span>
            <span className="text-[#7f8798]">Project ID: CP-{project.id}</span>
          </div>
          <h1 className="text-[64px] leading-[0.93] font-black tracking-tight text-[#122038] max-w-[760px]">
            {project.title}
          </h1>
        </div>

        {canAddTask && (
          <Link
            href={`/tasks/new?projectId=${project.id}`}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#c91f41] px-6 text-sm font-black text-white shadow-lg shadow-[#c91f41]/25 hover:bg-[#aa1a37]"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Link>
        )}
        </div>
      </section>

      <section className="bg-[#eef0f5] px-8 py-7 lg:px-10 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7">
        <div className="xl:col-span-4 space-y-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7f8798] mb-3">Departments Involved</p>
            <div className="flex flex-wrap gap-2">
              {project.departments.map((pd, index) => (
                <span
                  key={pd.id}
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-[10px] font-black",
                    index === 0 ? "bg-rose-100 text-rose-600" : "bg-[#dfe5f2] text-[#44506a]"
                  )}
                >
                  {pd.department.name}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#e5eaf5] border border-[#d8deeb] p-5 space-y-5 max-w-[260px]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6e778a]">Project Snapshot</p>

            <div>
              <div className="flex items-center justify-between text-[12px] font-bold text-[#25324a]">
                <span>Completion</span>
                <span className={completionTextColor}>{completion}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#d5dced]">
                <div className={`h-full rounded-full ${completionBarColor}`} style={{ width: `${completion}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7f8798]">Due Date</p>
                <p className="mt-1 text-sm font-black text-[#1a2740]">
                  {dueDate
                    ? dueDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                    : "TBD"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7f8798]">Priority</p>
                <p className="mt-1 text-sm font-black text-rose-600">{topPriority}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[42px] leading-none font-black tracking-tight text-[#1b2942]">Tasks ({project.tasks.length})</h2>
            <div className="flex items-center gap-2">
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#e1e6f1] text-[#6f7a8e] hover:text-[#c91f41]">
                <Filter className="h-3.5 w-3.5" />
              </button>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#e1e6f1] text-[#6f7a8e] hover:text-[#c91f41]">
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-transparent">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="text-left text-[9px] font-black uppercase tracking-[0.2em] text-[#7f8798] border-b border-[#dde1ea]">
                  <th className="px-4 py-3">Task Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Time Rem.</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {project.tasks.map((task) => (
                  <tr key={task.id} className="border-b border-[#dde1ea] last:border-b-0 hover:bg-white/30">
                    <td className="px-4 py-4">
                      <Link href={`/tasks/${task.id}`} className="block">
                        <p className="text-[20px] leading-tight font-black tracking-tight text-[#122038] hover:text-[#c91f41]">
                          {task.title}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-[#7f8798]">
                          Assigned to {task.assignedTo?.name || "Unassigned"}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-[#dfe5f2] px-2.5 py-1 text-[10px] font-black text-[#44506a]">
                        {task.assignedDepartment?.name || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-[#223149]">{formatRemaining(task)}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#4a556d]">
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClass(task.status))} />
                        {statusLabel(task.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {project.tasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm font-semibold text-[#7f8798]">
                      No tasks on this project yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 text-center">
            <Link href="/tasks" className="text-[10px] font-black uppercase tracking-[0.24em] text-[#2a354d] hover:text-[#c91f41]">
              View all tasks archive
            </Link>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
