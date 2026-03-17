import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ClipboardIcon,
  CheckmarkBadge01Icon,
  UserMultipleIcon,
  PlayIcon,
  Clock01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  TaskDone01Icon,
  Add01Icon,
  CheckmarkCircle01Icon,
} from "hugeicons-react";
import { DashboardSkeleton, ListSkeleton } from "@/components/skeletons";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function getStats(user: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [openTasks, doneTasks, teamMembers, doneToday] = await Promise.all([
    db.task.count({
      where: {
        OR: [
          { assignedUserId: user.id },
          ...(user.role === "MANAGER" && user.departmentId
            ? [{ deptId: user.departmentId }]
            : []),
          ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
        ],
        status: { notIn: ["DONE", "CANCELLED"] },
      },
    }),
    db.task.count({
      where: {
        OR: [
          { assignedUserId: user.id },
          ...(user.role === "MANAGER" && user.departmentId
            ? [{ deptId: user.departmentId }]
            : []),
          ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
        ],
        status: "DONE",
      },
    }),
    user.departmentId
      ? db.user.findMany({ 
          where: { departmentId: user.departmentId, isActive: true },
          select: { id: true, name: true },
          take: 5 
        })
      : db.user.findMany({ 
          where: { isActive: true },
          select: { id: true, name: true },
          take: 5 
        }),
    db.task.count({
      where: {
        status: "DONE",
        updatedAt: { gte: today },
        OR: [
          { assignedUserId: user.id },
          ...(user.role === "MANAGER" && user.departmentId
            ? [{ deptId: user.departmentId }]
            : []),
          ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
        ],
      }
    })
  ]);
  return { openTasks, doneTasks, teamMembers, doneToday };
}

async function getActivityData(user: any) {
  const [activeTasks, recentActivities] = await Promise.all([
    db.task.findMany({
      where: {
        OR: [
          { assignedUserId: user.id },
          ...(user.role === "MANAGER" && user.departmentId
            ? [{ deptId: user.departmentId }]
            : []),
          ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
        ],
        status: { in: ["IN_PROGRESS", "PAUSED"] },
      },
      include: { project: { include: { client: true } }, assignedTo: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    db.activityLog.findMany({
      where: {
        user: {
          OR: [
            { id: user.id },
            ...(user.role === "MANAGER" && user.departmentId
              ? [{ departmentId: user.departmentId }]
              : []),
            ...(user.role === "CEO" || user.role === "ADMIN" ? [{}] : []),
          ],
        },
      },
      include: { user: true, task: { include: { project: { include: { client: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  return { activeTasks, recentActivities };
}

async function StatsSection({ user, canCreateTask }: { user: any, canCreateTask: boolean }) {
  const { openTasks, doneTasks, teamMembers, doneToday } = await getStats(user);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#c91f41]" />
        <div className="flex items-start justify-between">
          <div className="space-y-4 w-full">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Tasks Pending</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter mt-1">{openTasks}</p>
            </div>
            {canCreateTask && (
              <Link href="/tasks/new" className="flex items-center gap-2 text-[#c91f41] hover:text-[#a81a36] transition-colors group/btn">
                <div className="w-8 h-8 rounded-lg bg-[#fff1f2] flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                  <Add01Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold tracking-tight">Add New Task</span>
              </Link>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#fff1f2] flex items-center justify-center flex-shrink-0">
            <ClipboardIcon className="h-5 w-5 text-[#c91f41]" />
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1">
        <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Completed Total</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter mt-1">{doneTasks}</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckmarkCircle01Icon className="h-4 w-4 text-green-500" />
               </div>
               <div>
                  <p className="text-xs font-bold text-gray-900">{doneToday}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Completed Today</p>
               </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckmarkBadge01Icon className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Active Team</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter mt-1">{teamMembers.length}</p>
            </div>
            <div className="flex -space-x-2 overflow-hidden">
              {teamMembers.map((member: any) => (
                <div key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 overflow-hidden flex items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-500">{member.name?.[0] ?? "U"}</span>
                </div>
              ))}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 ring-2 ring-white">
                +
              </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <UserMultipleIcon className="h-5 w-5 text-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

async function ActivitySection({ user }: { user: any }) {
  const { activeTasks, recentActivities } = await getActivityData(user);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <DeadlineCalendar tasks={activeTasks} />
      </div>

      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white shadow-sm rounded-3xl border border-gray-100 p-6 overflow-hidden relative h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fff1f2] flex items-center justify-center">
                <PlayIcon className="h-5 w-5 text-[#c91f41]" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight">Active Work</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">In Progress</p>
              </div>
            </div>
            {activeTasks.length > 0 && (
               <span className="bg-[#c91f41] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                 {activeTasks.length}
               </span>
            )}
          </div>
          {activeTasks.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {activeTasks.map((task) => (
                <a
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="group block p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-[#c91f41]/10 hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[#c91f41]">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-gray-400">{task.project?.client?.name}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[10px] font-bold text-gray-500">{task.project?.title}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <TaskDone01Icon className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-700">No open tasks</p>
              <p className="text-xs text-gray-400 mt-1">Enjoy the calm of a clear list.</p>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white shadow-sm rounded-3xl border border-gray-100 p-6 h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#fff1f2] flex items-center justify-center">
              <Clock01Icon className="h-5 w-5 text-[#c91f41]" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">Recent Activity</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Updates</p>
            </div>
          </div>
          {recentActivities.length > 0 ? (
            <div className="space-y-6">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#c91f41] before:z-10 after:absolute after:left-[2.5px] after:top-3 after:h-[calc(100%+0.5rem)] after:w-px after:bg-gray-100 last:after:hidden">
                  <p className="text-sm text-gray-900 font-bold leading-snug">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{activity.user.name}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-200" />
                    <span className="text-[10px] font-bold text-gray-400">{formatTime(activity.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Clock01Icon className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-700">No activity yet</p>
              <p className="text-xs text-gray-400 mt-1">Activities will appear as they happen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canCreateTask = user.role === "ADMIN" || user.role === "CEO" || user.role === "MANAGER";
  const firstName = user.name ? user.name.split(" ")[0] : "User";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {getGreeting()}, {firstName}
      </h1>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-150 shadow-sm p-5">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        }
      >
        <StatsSection user={user} canCreateTask={canCreateTask} />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton />}>
        <ActivitySection user={user} />
      </Suspense>
    </div>
  );
}

/* ───── Stat Card ───── */
// Removed previous StatCard as it's now inline for richer content per request

/* ───── Deadline Calendar ───── */
function DeadlineCalendar({
  tasks,
}: {
  tasks: Array<{ id: number; submittedAt: Date | null }>;
}) {
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long" });
  const year = today.getFullYear();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();

  // Calendar starts on Monday
  const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
  let firstDay = new Date(year, currentMonth, 1).getDay();
  // Convert Sunday=0 to Monday-based: Mon=0, Tue=1 ... Sun=6
  firstDay = firstDay === 0 ? 6 : firstDay - 1;

  const blanks = Array.from({ length: firstDay }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allDays = [...blanks, ...days];

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  // Get task deadlines for this month
  const taskDates = new Set<number>();
  tasks.forEach((task) => {
    if (task.submittedAt) {
      const taskDate = new Date(task.submittedAt);
      if (
        taskDate.getMonth() === currentMonth &&
        taskDate.getFullYear() === year
      ) {
        taskDates.add(taskDate.getDate());
      }
    }
  });

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-black text-gray-900 tracking-tight">Deadlines</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            {month} {year}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#c91f41] hover:bg-[#fff1f2] transition-all">
            <ArrowLeft01Icon className="h-4 w-4" />
          </button>
          <button className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#c91f41] hover:bg-[#fff1f2] transition-all">
            <ArrowRight01Icon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((day, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-black text-gray-300 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day, idx) => (
          <div key={idx} className="aspect-square flex flex-col items-center justify-center relative">
            {day ? (
              <button
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all relative z-10",
                  day === currentDay
                    ? "bg-[#c91f41] text-white shadow-md shadow-[#c91f41]/20"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {day}
                {taskDates.has(day) && (
                  <span className={cn(
                    "absolute bottom-1 w-1 h-1 rounded-full",
                    day === currentDay ? "bg-white" : "bg-[#c91f41]"
                  )} />
                )}
              </button>
            ) : (
              <div className="w-7 h-7" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───── Helper function ───── */
function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString();
}

