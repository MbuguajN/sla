import { redirect, notFound } from "next/navigation";
import { getCurrentUser, canAccessProject, canCreateTask } from "@/lib/permissions";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  ArrowLeft,
  FolderKanban,
  Briefcase,
  Plus,
  ListChecks,
  Building2,
  ExternalLink,
  Clock,
} from "lucide-react";

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

  if (!project) {
    notFound();
  }

  const hasAccess = await canAccessProject(user, project.id);
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const canAddTask = canCreateTask(user);

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    ON_HOLD: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  const taskStatusColors: Record<string, string> = {
    UNASSIGNED: "bg-gray-100 text-gray-700",
    ASSIGNED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-indigo-100 text-indigo-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    PAUSED: "bg-orange-100 text-orange-700",
    SUBMITTED: "bg-purple-100 text-purple-700",
    REVISION: "bg-red-100 text-red-700",
    DONE: "bg-green-100 text-green-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Project Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#fef2f4] flex items-center justify-center">
              <FolderKanban className="h-7 w-7 text-[#c91f41]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    statusColors[project.status] || statusColors.ACTIVE
                  }`}
                >
                  {project.status}
                </span>
              </div>
              <Link
                href={`/clients/${project.clientId}`}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#c91f41] mt-1"
              >
                <Briefcase className="h-4 w-4" />
                {project.client.name}
              </Link>
            </div>
          </div>
          {canAddTask && (
            <Link
              href={`/tasks/new?projectId=${project.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Task
            </Link>
          )}
        </div>

        {project.description && (
          <p className="mt-4 text-sm text-gray-600">{project.description}</p>
        )}

        {project.briefLink && (
          <a
            href={project.briefLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-[#c91f41] hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View Brief
          </a>
        )}

        {/* Departments */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Departments
          </p>
          <div className="flex flex-wrap gap-2">
            {project.departments.map((pd) => (
              <span
                key={pd.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
              >
                <Building2 className="h-3 w-3" />
                {pd.department.name}
                <span className="text-gray-400">({pd.slaHours}h SLA)</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[#c91f41]" />
            <h2 className="text-base font-semibold text-gray-900">
              Tasks ({project.tasks.length})
            </h2>
          </div>
        </div>

        {project.tasks.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {project.tasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <ListChecks className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.assignedDepartment && (
                        <span className="text-xs text-gray-400">
                          {task.assignedDepartment.name}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className="text-xs text-gray-400">
                          • {task.assignedTo.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {task.slaHours && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {task.slaHours}h
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      taskStatusColors[task.status] || taskStatusColors.UNASSIGNED
                    }`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ListChecks className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No tasks yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {canAddTask
                ? "Create a task to get started"
                : "Tasks will appear here once created"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
