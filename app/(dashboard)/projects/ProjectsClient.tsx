"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Folder01Icon,
  Add01Icon,
  Search01Icon,
  Tick02Icon,
  More01Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

type ProjectItem = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  clientId: number;
  clientName: string;
  departments: string[];
  taskCount: number;
  closedTaskCount?: number; // Optional based on the screenshot data
  createdAt: string;
  progress?: number; // Momentum percentage
};

interface Props {
  initialProjects: ProjectItem[];
  canCreate: boolean;
}

export default function ProjectsClient({ initialProjects, canCreate }: Props) {
  const [projects] = useState<ProjectItem[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ["ALL", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-gray-100/50">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 bg-rose-50 rounded-lg">
              <Folder01Icon className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.15em]">Operational Overview</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#111827]">
            Projects <span className="text-rose-500">Inventory</span>
          </h1>
          <p className="text-[#9ca3af] mt-1 font-medium text-xs">
            {projects.length} Total Initiatives • <span className="text-rose-500 font-bold">{projects.filter(p => p.status === 'ACTIVE').length} Active</span>
          </p>
        </div>
        
        {canCreate && (
          <Link href="/projects/new">
            <button className="group flex items-center gap-2.5 bg-white hover:bg-rose-50 border border-gray-100 hover:border-rose-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl h-11 px-6 active:scale-95">
              <div className="w-6 h-6 rounded-md bg-rose-50 group-hover:bg-rose-500 flex items-center justify-center transition-colors">
                <Add01Icon className="w-3 h-3 text-rose-500 group-hover:text-white" />
              </div>
              <span className="font-bold text-sm text-[#111827] tracking-tight">New Project</span>
            </button>
          </Link>
        )}
      </div>

      {/* Modern Search & Filters */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/50 p-1.5 rounded-2xl border border-gray-50 shadow-sm">
        <div className="relative w-full lg:max-w-sm group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search01Icon className="w-4 h-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-200 transition-all font-medium text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1 overflow-x-auto whitespace-nowrap">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95",
                statusFilter === status 
                  ? "bg-[#111827] text-white shadow-md shadow-gray-200" 
                  : "bg-transparent text-gray-500 hover:text-[#111827] hover:bg-gray-50"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Pixel Matched Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProjects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <div className="group relative bg-white border border-gray-100/60 rounded-2xl p-4 transition-all duration-500 hover:shadow-[0_12px_30px_-10px_rgba(244,63,94,0.08)] hover:-translate-y-1 flex flex-col gap-4 overflow-hidden">
              {/* Background Accent Deco */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50/20 rounded-full blur-2xl -mr-6 -mt-6" />
              
              {/* Card Top Row */}
              <div className="flex items-start justify-between relative z-10">
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  <span className="text-[8px] font-black text-[#9ca3af] uppercase tracking-[0.2em]">Enterprise</span>
                  <h3 className="text-base font-black text-[#111827] tracking-tight leading-tight group-hover:text-rose-600 transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                  <p className="text-[12px] font-bold text-[#6b7280] tracking-tight truncate">{project.clientName}</p>
                </div>
                
                <div className={cn(
                  "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex-shrink-0",
                   project.status === 'ACTIVE' ? "bg-rose-50 text-rose-500" : "bg-gray-100 text-gray-500"
                )}>
                  {project.status}
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#111827]">Momentum</span>
                  <span className="text-xl font-black text-rose-500 tabular-nums tracking-tighter">
                    {project.progress || 0}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-rose-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#f8faff] rounded-xl p-3 flex items-center gap-2 transition-transform group-hover:scale-[1.02]">
                  <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <Tick02Icon className="w-3 h-3 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-[#111827] tracking-tight leading-none">{project.closedTaskCount || 0}</div>
                    <div className="text-[7px] font-black text-[#9ca3af] uppercase tracking-widest mt-0.5">Closed</div>
                  </div>
                </div>

                <div className="bg-[#f8faff] rounded-xl p-3 flex items-center gap-2 transition-transform group-hover:scale-[1.02] delay-75">
                  <div className="w-6 h-6 rounded-full bg-gray-200/50 flex items-center justify-center flex-shrink-0">
                    <More01Icon className="w-3 h-3 text-[#6b7280]" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-[#111827] tracking-tight leading-none">{project.taskCount - (project.closedTaskCount || 0)}</div>
                    <div className="text-[7px] font-black text-[#9ca3af] uppercase tracking-widest mt-0.5">Open</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 border border-dashed border-gray-200 rounded-3xl">
          <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
            <Folder01Icon className="w-10 h-10 text-gray-200" />
          </div>
          <p className="text-2xl font-black text-gray-400">Project Not Found</p>
          <p className="text-gray-400/80 font-medium mt-2">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}

