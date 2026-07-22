import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import { 
  Folder01Icon, 
  Task01Icon, 
  UserGroupIcon, 
  Building01Icon,
  Tick02Icon,
  Clock01Icon,
  AlertCircleIcon
} from "@hugeicons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Route group root ("/") should always land on the actual dashboard entry route.
  if (user.role === "ADMIN") {
    redirect("/admin");
  }
  redirect("/dashboard");

  const stats = await Promise.all([
    db.project.count(),
    db.task.count({ where: { status: { not: "DONE" } } }),
    db.user.count(),
    db.department.count(),
  ]);

  const recentTasks = await db.task.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { project: true, assignedTo: true },
  });

  const cards = [
    { label: "Active Initiatives", value: stats[0], icon: Folder01Icon, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
    { label: "Pending Protocol", value: stats[1], icon: Task01Icon, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Workforce Base", value: stats[2], icon: UserGroupIcon, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
    { label: "Entity Nodes", value: stats[3], icon: Building01Icon, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
           <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#111827] dark:text-white">
            System <span className="text-rose-500 italic">Command</span>
          </h1>
          <p className="text-[#9ca3af] dark:text-zinc-500 font-bold text-sm">
            Welcome back, <span className="text-[#111827] dark:text-white">{user?.name}</span> - Sector: {user?.departmentSlug || "Unassigned"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 px-6 rounded-2xl bg-white dark:bg-black border border-gray-100 dark:border-white/10 flex items-center gap-3 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#111827] dark:text-white">Neural Link Active</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="group relative bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-1.5 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-500/10 hover:-translate-y-2">
             <div className="bg-[#fcfdfe] dark:bg-black rounded-[2rem] p-8 space-y-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500", card.bg)}>
                   <card.icon className={cn("w-7 h-7", card.color)} />
                </div>
                <div className="space-y-1">
                   <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                    <p className="text-3xl md:text-4xl font-black text-[#111827] dark:text-white tabular-nums tracking-tighter">{card.value}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-[#111827] dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Clock01Icon className="w-5 h-5 text-rose-500" />
            Task Transmission Log
          </h2>
          <div className="bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-white/10 rounded-[2.5rem] overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="border-b border-gray-50 dark:border-white/5">
                     <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol</th>
                     <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                     <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                     <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 dark:divide-white/5 font-bold text-sm">
                   {recentTasks.map((task) => (
                     <tr key={task.id} className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                       <td className="px-8 py-6 dark:text-white">{task.title}</td>
                       <td className="px-8 py-6 text-gray-400">{task.project.title}</td>
                       <td className="px-8 py-6">
                         <span className={cn(
                           "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                           task.status === "DONE" ? "border-emerald-100 text-emerald-600 bg-emerald-50/20" : "border-rose-100 text-rose-600 bg-rose-50/20"
                         )}>
                           {task.status}
                         </span>
                       </td>
                       <td className="px-8 py-6">
                         <Link href={`/tasks/${task.id}`} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors inline-block group/link">
                           <Tick02Icon className="w-4 h-4 text-gray-400 group-hover/link:text-rose-500" />
                         </Link>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black text-[#111827] dark:text-white uppercase tracking-tight flex items-center gap-3">
             <AlertCircleIcon className="w-5 h-5 text-rose-500" />
             System Status
          </h2>
          <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-8 space-y-8">
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase text-gray-400">Core Integrity</span>
                   <span className="text-[10px] font-black text-emerald-500">99.8%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-[99.8%]" />
                </div>
             </div>
             <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Operations</p>
                <div className="flex -space-x-2">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-10 h-10 rounded-xl border-2 border-white dark:border-black bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-gray-400">
                        OP-{i}
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
