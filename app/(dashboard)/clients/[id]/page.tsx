import { redirect, notFound } from "next/navigation";
import { getCurrentUser, canViewClients, canOnboardClient, canCreateProject } from "@/lib/permissions";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Briefcase, FolderKanban, Plus, ExternalLink } from "lucide-react";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewClients(user)) redirect("/dashboard");

  const client = await db.client.findUnique({
    where: { id: parseInt(id) },
    include: {
      projects: {
        include: {
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const canEdit = canOnboardClient(user);
  const canAddProject = canCreateProject(user) && client.status === "ACTIVE";

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    ON_HOLD: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </Link>

      {/* Client Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#fef2f4] flex items-center justify-center">
              <Briefcase className="h-7 w-7 text-[#c91f41]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              {client.status === "CLOSED" && (
                <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Client Closed
                </span>
              )}
              {client.contactName && (
                <p className="text-sm text-gray-500 mt-1">{client.contactName}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                {client.email && <span>{client.email}</span>}
                {client.phone && <span>{client.phone}</span>}
              </div>
            </div>
          </div>
          {canAddProject && (
            <Link
              href={`/projects/new?clientId=${client.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          )}
        </div>
        {client.description && (
          <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
            {client.description}
          </p>
        )}
      </div>

      {/* Projects */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[#c91f41]" />
            <h2 className="text-base font-semibold text-gray-900">
              Projects ({client.projects.length})
            </h2>
          </div>
        </div>

        {client.projects.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {client.projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <FolderKanban className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{project.title}</p>
                    <p className="text-xs text-gray-400">
                      {project._count.tasks} tasks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      statusColors[project.status] || statusColors.ACTIVE
                    }`}
                  >
                    {project.status}
                  </span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderKanban className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No projects yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {canAddProject
                ? "Create a project to get started"
                : "Projects will appear here once created"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
