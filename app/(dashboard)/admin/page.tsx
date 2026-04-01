import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import Link from "next/link";
import { Users, Building2, Settings, Activity, Play } from "lucide-react";

function formatActivityDescription(activity: any) {
  if (activity.task?.title) {
    return `${activity.type.replaceAll("_", " ")}: ${activity.task.title}`;
  }
  if (activity.project?.title) {
    return `${activity.type.replaceAll("_", " ")}: ${activity.project.title}`;
  }
  return activity.description;
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [totalUsers, activeUsers, totalDepartments, activeTasks, recentActivities] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.department.count(),
    db.task.findMany({
      where: { status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      include: {
        project: { include: { client: true } },
        assignedTo: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.activityLog.findMany({
      include: {
        user: true,
        task: true,
        project: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={totalUsers}
          subtext={`${activeUsers} active`}
          icon={Users}
        />
        <StatCard
          label="Departments"
          value={totalDepartments}
          icon={Building2}
        />
        <StatCard
          label="System"
          value="Active"
          icon={Settings}
        />
        <StatCard
          label="Active Work"
          value={activeTasks.length}
          icon={Play}
        />
      </div>

      {/* Admin Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-black shadow-sm dark:shadow-none rounded-3xl border border-gray-100 dark:border-white/10 p-6 overflow-hidden relative flex flex-col" style={{ height: "520px" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#fff1f2] dark:bg-[#c91f41]/10 flex items-center justify-center">
                  <Play className="h-5 w-5 text-[#c91f41]" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Active Work</h2>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">All Confirmed & In Progress</p>
                </div>
              </div>
              {activeTasks.length > 0 && (
                <span className="bg-[#c91f41] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                  {activeTasks.length}
                </span>
              )}
            </div>

            {activeTasks.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {activeTasks.map((task: any) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="group block p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-transparent hover:border-[#c91f41]/10 dark:hover:border-[#c91f41]/30 hover:bg-white dark:hover:bg-[#111] hover:shadow-lg dark:hover:shadow-none transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#c91f41]">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">{task.project?.client?.name || "No Client"}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400">{task.project?.title || "No Project"}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#c91f41]">{task.status.replaceAll("_", " ")}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                  <Play className="h-6 w-6 text-gray-300 dark:text-zinc-700" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">No active work</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-black shadow-sm dark:shadow-none rounded-3xl border border-gray-100 dark:border-white/10 p-6 overflow-hidden relative flex flex-col" style={{ height: "520px" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Recent Activity</h2>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">All Activity Logs</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 relative">
              <div className="absolute left-[7px] top-2 bottom-4 w-0.5 bg-gray-100 dark:bg-white/5" />
              {recentActivities.map((activity: any) => (
                <div key={activity.id} className="relative pl-7 flex flex-col gap-1">
                  <div className="absolute left-0 top-[6px] w-4 h-4 rounded-full bg-white dark:bg-black border-2 border-[#c91f41] flex items-center justify-center z-10">
                    <div className="w-1 h-1 rounded-full bg-[#c91f41] animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                    {formatActivityDescription(activity)}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-tight">{activity.user?.name || "System"}</p>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-tight">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center opacity-40 italic">
                  <p className="text-xs text-gray-400">Activity stream is quiet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  subtext?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-white/10 border-l-[3px] border-l-[#c91f41] p-3.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtext && (
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">{subtext}</p>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#c91f41]" />
        </div>
      </div>
    </div>
  );
}
