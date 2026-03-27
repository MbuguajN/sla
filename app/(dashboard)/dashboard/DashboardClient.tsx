"use client";

import { useState, useEffect } from "react";
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
  CheckmarkCircle01Icon 
} from "hugeicons-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import RealtimeRefresh from "@/components/RealtimeRefresh";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatActivityDescription(activity: any) {
  const title = activity.task?.title;
  const projectTitle = activity.task?.project?.title;
  if (title && projectTitle) return activity.description + " - " + title + " (" + projectTitle + ")";
  if (title) return activity.description + " - " + title;
  return activity.description;
}

function DeadlineCalendar({ tasks }: { tasks: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const monthDays = [];
  for (let i = 0; i < firstDay; i++) monthDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) monthDays.push(i);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  return (
    <div className="bg-white dark:bg-black shadow-sm dark:shadow-none rounded-3xl border border-gray-100 dark:border-white/10 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">Deadlines</h2>
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft01Icon className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <ArrowRight01Icon className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4 flex-1">
        {days.map(day => (
          <div key={day} className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 text-center py-2">{day}</div>
        ))}
        {monthDays.map((day, idx) => {
          const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
          return (
            <div 
              key={idx} 
              className={cn(
                "aspect-square flex items-center justify-center text-[11px] font-bold rounded-xl transition-all",
                day ? "hover:bg-gray-50 dark:hover:bg-white/5 cursor-default text-gray-900 dark:text-zinc-300" : "",
                isToday ? "bg-[#c91f41] text-white hover:bg-[#c91f41] shadow-lg shadow-[#c91f41]/20 scale-110" : ""
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardClient({ user, stats, activity }: { user: any, stats: any, activity: any }) {
  const { openTasks, doneTasks, teamMembers, doneToday } = stats;
  const { activeTasks, recentActivities } = activity;

  const canSeeAddTaskInCard = 
    user.role === "ADMIN" || 
    user.role === "CEO" || 
    user.departmentSlug === "client-service" || 
    user.departmentSlug === "business-development";

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <RealtimeRefresh />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter italic uppercase underline decoration-[#c91f41] decoration-4 underline-offset-4">
          {getGreeting()}, {user.name.split(' ')[0]}
        </h1>
        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Enterprise Operations Control</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-white/10 p-6 transition-all duration-300 hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#c91f41]" />
          <div className="flex items-start justify-between">
            <div className="space-y-4 w-full">
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.15em]">Tasks Pending</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mt-1">{openTasks}</p>
              </div>
              {canSeeAddTaskInCard && (
                <Link href="/tasks/new" className="flex items-center gap-2 text-[#c91f41] hover:text-[#a81a36] transition-colors group/btn">
                  <div className="w-8 h-8 rounded-lg bg-[#fff1f2] dark:bg-[#c91f41]/10 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                    <Add01Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold tracking-tight">Add New Task</span>
                </Link>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#fff1f2] dark:bg-[#c91f41]/10 flex items-center justify-center flex-shrink-0">
              <ClipboardIcon className="h-5 w-5 text-[#c91f41]" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-white/10 p-6 transition-all duration-300 hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.15em]">Completed Total</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mt-1">{doneTasks}</p>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                    <CheckmarkCircle01Icon className="h-4 w-4 text-green-500" />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-zinc-200">{doneToday}</p>
                    <p className="text-[8px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Completed Today</p>
                 </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckmarkBadge01Icon className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-white/10 p-6 transition-all duration-300 hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.15em]">Active Team</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mt-1">{teamMembers.length}</p>
              </div>
              <div className="flex -space-x-2 overflow-hidden">
                {teamMembers.map((member: any) => (
                  <div key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-black bg-gray-100 dark:bg-[#111] overflow-hidden flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400">{member.name?.[0] ?? "U"}</span>
                  </div>
                ))}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400 ring-2 ring-white dark:ring-black">
                  +
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <UserMultipleIcon className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <DeadlineCalendar tasks={activeTasks} />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-black shadow-sm dark:shadow-none rounded-3xl border border-gray-100 dark:border-white/10 p-6 overflow-hidden relative flex flex-col" style={{ height: "480px" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#fff1f2] dark:bg-[#c91f41]/10 flex items-center justify-center">
                  <PlayIcon className="h-5 w-5 text-[#c91f41]" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Active Work</h2>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Confirmed & In Progress</p>
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
                    href={"/tasks/" + task.id}
                    className="group block p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-transparent hover:border-[#c91f41]/10 dark:hover:border-[#c91f41]/30 hover:bg-white dark:hover:bg-[#111] hover:shadow-lg dark:hover:shadow-none transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#c91f41]">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">{task.project?.client?.name}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400">{task.project?.title}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                  <TaskDone01Icon className="h-6 w-6 text-gray-300 dark:text-zinc-700" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">No open tasks</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Enjoy the calm of a clear list.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-black shadow-sm dark:shadow-none rounded-3xl border border-gray-100 dark:border-white/10 p-6 overflow-hidden relative flex flex-col" style={{ height: "480px" }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <Clock01Icon className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Recent Activity</h2>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Live Updates</p>
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
                      <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-tight">{activity.user?.name}</p>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                      <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-tight">
                        {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()} ago
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
