"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, FolderKanban, Plus, Mail, Phone, Search, ArrowRight } from "lucide-react";

export type ProjectItem = {
  id: number;
  title: string;
  status: string;
  taskCount: number;
  doneCount: number;
  overdueCount: number;
  departments: string[];
  year: string;
};

type ClientInfo = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  description: string | null;
  status: string;
};

interface Props {
  client: ClientInfo;
  projects: ProjectItem[];
  totalOverdue: number;
  canAddProject: boolean;
}

const avatarColors = [
  "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400",
  "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
  "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400",
  "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400",
  "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
  "bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400",
  "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
];

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: {
    label: "IN PROGRESS",
    bg: "bg-teal-100 dark:bg-teal-500/20",
    text: "text-teal-700 dark:text-teal-400",
  },
  ON_HOLD: {
    label: "ON HOLD",
    bg: "bg-gray-100 dark:bg-white/10",
    text: "text-gray-600 dark:text-zinc-400",
  },
  COMPLETED: {
    label: "COMPLETED",
    bg: "bg-blue-100 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
  },
  CANCELLED: {
    label: "CANCELLED",
    bg: "bg-red-100 dark:bg-red-500/20",
    text: "text-red-700 dark:text-red-400",
  },
};

function getInitials(title: string, index: number): string {
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
}

export default function ClientDetailClient({ client, projects, totalOverdue, canAddProject }: Props) {
  const [search, setSearch] = useState("");

  const totalTasks = projects.reduce((s, p) => s + p.taskCount, 0);
  const totalDone = projects.reduce((s, p) => s + p.doneCount, 0);
  const completionRate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;
  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        p.departments.some((d) => d.toLowerCase().includes(q))
    );
  }, [projects, search]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Clients
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
            {client.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2">
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-[#c91f41] dark:hover:text-[#c91f41] transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </a>
            )}
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-[#c91f41] dark:hover:text-[#c91f41] transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </a>
            )}
            {client.status === "CLOSED" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Closed
              </span>
            )}
          </div>
        </div>
        {canAddProject && (
          <Link
            href={`/projects/new?clientId=${client.id}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#c91f41] text-white rounded-lg text-sm font-semibold hover:bg-[#a61835] transition-all shadow-lg shadow-[#c91f41]/25 dark:shadow-[#c91f41]/15 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0f0f0f] rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-sm dark:shadow-none">
          <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-3">
            Active Projects
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white">
            {String(activeProjects).padStart(2, "0")}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f0f0f] rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-sm dark:shadow-none">
          <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-3">
            Completion Rate
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white">
            {completionRate}%
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20 p-6 shadow-sm dark:shadow-none">
          <p className="text-[11px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest mb-3">
            Overdue Tasks
          </p>
          <p className="text-3xl font-black text-red-600 dark:text-red-400">
            {String(totalOverdue).padStart(2, "0")}
          </p>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white dark:bg-[#0f0f0f] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-base font-black text-gray-900 dark:text-white">
            {search ? "Search Results" : "Active Projects"}
          </h2>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-600 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-48 pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg placeholder-gray-400 dark:placeholder:text-zinc-600 text-gray-900 dark:text-white focus:outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/20 transition-all"
            />
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_auto] px-6 py-3 bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
          <span className="text-[11px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest">
            Project Name
          </span>
          <span className="text-[11px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mr-8">
            Status
          </span>
        </div>

        {/* Rows */}
        {filteredProjects.length > 0 ? (
          <div>
            {filteredProjects.map((project, idx) => {
              const sc = statusConfig[project.status] || statusConfig.ACTIVE;
              const color = avatarColors[idx % avatarColors.length];
              const initials = getInitials(project.title, idx);
              const subtitle = [
                project.departments[0] || null,
                project.year,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${color}`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#c91f41] transition-colors truncate">
                        {project.title}
                      </p>
                      {subtitle && (
                        <p className="text-xs text-[#c91f41] dark:text-[#e05070] mt-0.5 font-medium truncate">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${sc.bg} ${sc.text}`}
                    >
                      {sc.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-6">
            <FolderKanban className="h-12 w-12 text-gray-200 dark:text-zinc-700 mx-auto mb-4" />
            <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
              {search ? "No projects match your search" : "No projects yet"}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-600 mt-1">
              {!search && canAddProject ? "Create a project to get started" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
