"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft01Icon, Cancel01Icon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

type Employee = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  department: { id: number; name: string; slug: string } | null;
};

type LeaveBalance = {
  type: string;
  label: string;
  color: string;
  used: number;
  allowed: number;
  remaining: number;
  percentage: number;
};

type Document = {
  id: number;
  name: string;
  url: string;
  createdAt: string;
};

type CompanyItem = {
  id: number;
  name: string;
  category: string | null;
  serialNumber: string | null;
};

interface Props {
  employee: Employee;
  completedTasks: number;
  activeTasks: number;
  leaveBalances: LeaveBalance[];
  documents: Document[];
  companyItems: CompanyItem[];
  currentUserId: number;
  currentUserRole: string;
}

const AVATAR_COLORS = [
  "#c91f41", "#6366f1", "#059669", "#d97706", "#7c3aed",
  "#0891b2", "#be185d", "#4f46e5", "#0d9488", "#b45309",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMIN: "Administrator",
    CEO: "Director",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
  };
  return labels[role] || role;
}

export default function EmployeeProfileClient({
  employee,
  completedTasks,
  activeTasks,
  leaveBalances,
  documents,
  companyItems,
  currentUserId,
  currentUserRole,
}: Props) {
  const router = useRouter();
  const color = getAvatarColor(employee.name);
  const initials = getInitials(employee.name);
  const totalTasks = completedTasks + activeTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-8 pt-4">
      {/* Back button */}
      <button
        onClick={() => router.push("/employees")}
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-gray-500 hover:text-[#c91f41] dark:text-zinc-400 dark:hover:text-[#c91f41] transition-colors"
      >
        <ArrowLeft01Icon className="h-4 w-4" />
        Back to Directory
      </button>

      {/* HERO: Employee Professional Summary */}
      <section className="overflow-hidden border-b-4 border-[#c91f41] bg-white dark:bg-black/40">
        <div className="grid grid-cols-12 gap-10 p-8 md:p-10">
          {/* Avatar */}
          <div className="col-span-12 flex flex-col items-center gap-6 lg:col-span-4 lg:items-start">
            <div className="relative">
              <div className="flex h-52 w-40 items-center justify-center border-2 border-gray-900 dark:border-white"
                style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}
              >
                <span
                  className="text-7xl font-black text-white"
                  style={{ color }}
                >
                  {initials}
                </span>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-[#c91f41] p-3 text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="col-span-12 flex flex-col justify-center gap-4 lg:col-span-8">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c91f41]">
                {employee.department?.name || "No Department"} / {getRoleLabel(employee.role)}
              </span>
              <h2 className="text-5xl font-black uppercase leading-none tracking-tight text-gray-900 dark:text-white">
                {employee.name}
              </h2>
            </div>

            <div className="mt-4 flex gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] opacity-40">Department</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {employee.department?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] opacity-40">Status</span>
                <span className="text-sm font-bold text-[#c91f41]">● Active</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] opacity-40">Joined</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {new Date(employee.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS & LEAVE GRID */}
      <section className="grid grid-cols-12 gap-10">
        {/* Performance Metrics */}
        <div className="col-span-12 space-y-6 lg:col-span-7">
          <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
              Performance Metrics
            </h3>
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41]">
              All Time
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                Completed Tasks
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#c91f41]">{completedTasks.toLocaleString()}</span>
              </div>
              <div className="h-1 w-full overflow-hidden bg-gray-200 dark:bg-white/10">
                <div
                  className="h-full bg-[#c91f41] transition-all duration-1000"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                Active Queue
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-gray-900 dark:text-white">{activeTasks}</span>
              </div>
              <div className="h-1 w-full overflow-hidden bg-gray-200 dark:bg-white/10">
                <div
                  className="h-full bg-gray-900 dark:bg-white transition-all duration-1000"
                  style={{ width: totalTasks > 0 ? `${Math.round((activeTasks / totalTasks) * 100)}%` : "0%" }}
                />
              </div>
            </div>
          </div>

          {/* Efficiency Card */}
          <div className="relative overflow-hidden bg-gray-900 p-8 text-white dark:bg-gray-800 dark:text-white">
            <div className="relative z-10 space-y-2">
              <h4 className="text-xl font-black tracking-tight">Task Completion Rate</h4>
              <p className="max-w-sm text-sm opacity-70">
                Based on all assigned tasks across projects and departments.
              </p>
              <div className="flex items-center gap-6 pt-4">
                <span className="text-5xl font-black text-[#c91f41]">{completionRate}%</span>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.14em] opacity-50">
                    <span>0%</span>
                    <span>Target: 80%</span>
                    <span>100%</span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-[#c91f41]"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full border-[20px] border-[#c91f41]/10" />
          </div>
        </div>

        {/* Leave Balance */}
        <div className="col-span-12 space-y-6 lg:col-span-5">
          <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
              Leave Balance
            </h3>
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41]">
              {new Date().getFullYear()}
            </span>
          </div>

          <div className="space-y-8 border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-black/40">
            {leaveBalances.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-zinc-500">No leave policies configured.</p>
            ) : (
              leaveBalances.map((lb) => (
                <div key={lb.type} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{lb.label}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.14em]">
                      {lb.used} / {lb.allowed} DAYS
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000", lb.color)}
                      style={{ width: `${lb.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* DOCUMENTS REPOSITORY */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
          <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
            Uploaded Documents
          </h3>
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41]">
            {documents.length} files
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center dark:border-white/10 dark:bg-black/40">
            <p className="text-sm font-semibold text-gray-400 dark:text-zinc-500">
              No documents uploaded yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white dark:border-white/10 dark:bg-black/40">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-900 dark:border-white text-left">
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                    Document Name
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                    Uploaded On
                  </th>
                  <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-[#c91f41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-500 dark:text-zinc-400">
                      {new Date(doc.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-5 text-right">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 transition-colors hover:text-[#c91f41] dark:text-zinc-500"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* COMPANY ITEMS OWNED */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
          <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
            Company Items Owned
          </h3>
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41]">
            {companyItems.length} items
          </span>
        </div>

        {companyItems.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center dark:border-white/10 dark:bg-black/40">
            <p className="text-sm font-semibold text-gray-400 dark:text-zinc-500">
              No company items assigned.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white dark:border-white/10 dark:bg-black/40">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-900 dark:border-white text-left">
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                    Item Name
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                    Category
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                    Serial Number
                  </th>
                </tr>
              </thead>
              <tbody>
                {companyItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-[#c91f41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-500 dark:text-zinc-400">
                      {item.category || "—"}
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-500 dark:text-zinc-400">
                      {item.serialNumber || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
