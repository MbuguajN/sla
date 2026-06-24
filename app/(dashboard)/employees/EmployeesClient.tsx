"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Add01Icon, Search01Icon, Cancel01Icon, Tick01Icon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { searchUsersForAccess, grantEmployeesAccess, revokeEmployeesAccess } from "@/app/actions/employeeDirectoryActions";

type Employee = {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  departmentSlug: string | null;
  createdAt: string;
  tasksCompleted: number;
  tasksActive: number;
  leavesApproved: number;
  leavesPending: number;
  documentsCount: number;
  isOnLeave: boolean;
};

interface Props {
  employees: Employee[];
  departments: string[];
  currentUserRole: string;
  totalCount: number;
  activeCount: number;
  canManageAccess: boolean;
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
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getStatusInfo(emp: Employee) {
  if (emp.isOnLeave) return { label: "On Leave", color: "bg-amber-500" };
  if (emp.tasksActive > 0) return { label: `Active (${emp.tasksActive} tasks)`, color: "bg-emerald-500" };
  return { label: "Available", color: "bg-emerald-500" };
}

const PAGE_SIZE = 12;

type AccessUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  hasAccess: boolean;
};

export default function EmployeesClient({ employees, departments, currentUserRole, totalCount, activeCount, canManageAccess }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeDept, setActiveDept] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteUsers, setInviteUsers] = useState<AccessUser[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchesDept =
        activeDept === "ALL" || emp.department === activeDept;
      const matchesSearch =
        !needle ||
        emp.name.toLowerCase().includes(needle) ||
        emp.email.toLowerCase().includes(needle) ||
        emp.role.toLowerCase().includes(needle) ||
        (emp.department || "").toLowerCase().includes(needle);
      return matchesDept && matchesSearch;
    });
  }, [employees, search, activeDept]);

  const visibleEmployees = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const fetchInviteUsers = useCallback(async (query: string) => {
    setInviteLoading(true);
    try {
      const users = await searchUsersForAccess(query);
      setInviteUsers(users);
    } catch {
      setInviteUsers([]);
    }
    setInviteLoading(false);
  }, []);

  useEffect(() => {
    if (!showInvitePopup) return;
    const timer = setTimeout(() => fetchInviteUsers(inviteSearch), 300);
    return () => clearTimeout(timer);
  }, [inviteSearch, showInvitePopup, fetchInviteUsers]);

  const toggleAccess = async (userId: number, currentlyHasAccess: boolean) => {
    setTogglingId(userId);
    try {
      if (currentlyHasAccess) {
        await revokeEmployeesAccess(userId);
      } else {
        await grantEmployeesAccess(userId);
      }
      setInviteUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, hasAccess: !currentlyHasAccess } : u))
      );
      router.refresh();
    } catch {
      // silent
    }
    setTogglingId(null);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border-l-8 border-[#c91f41] bg-gradient-to-br from-gray-50 to-white px-8 py-6 dark:from-gray-900 dark:to-black md:px-12 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c91f41]">
              Operations Control
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-gray-900 dark:text-white">
              Employees
            </h1>
            {canManageAccess && (
              <button
                onClick={() => {
                  setShowInvitePopup(true);
                  setInviteSearch("");
                  fetchInviteUsers("");
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#c91f41] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-[#c91f41]/20 transition hover:bg-[#a01832]"
              >
                <Add01Icon className="h-4 w-4" />
                Invite Member
              </button>
            )}
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                Total Talent
              </span>
              <span className="text-2xl font-black text-[#c91f41]">{totalCount}</span>
            </div>
            <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">
                Active Now
              </span>
              <span className="text-2xl font-black text-emerald-600">{activeCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search01Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search employees..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#c91f41]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <div className="relative">
          <select
            value={activeDept}
            onChange={(e) => {
              setActiveDept(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="h-11 appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-xs font-black uppercase tracking-[0.14em] text-gray-900 outline-none focus:ring-2 focus:ring-[#c91f41]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="ALL" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">All Staff</option>
            {departments.map((dept) => (
              <option key={dept} value={dept} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">{dept}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {/* Employee Grid */}
      {visibleEmployees.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center dark:border-white/10 dark:bg-black/40">
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">
            No employees found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleEmployees.map((emp) => {
            const status = getStatusInfo(emp);
            const color = getAvatarColor(emp.name);
            const initials = getInitials(emp.name);

            return (
              <div
                key={emp.id}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-black/40"
              >
                {/* Avatar Area */}
                <div className="relative flex h-44 items-center justify-center overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}
                >
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-black text-white shadow-lg transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundColor: color }}
                  >
                    {initials}
                  </div>
                  {/* Department badge */}
                  {emp.department && (
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-gray-700 shadow-sm dark:bg-black/60 dark:text-zinc-300">
                      {emp.department}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {emp.name}
                  </h3>
                  <p className="mb-2 text-xs font-bold text-[#c91f41]">{emp.role}</p>

                  <div className="mb-4 flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", status.color)} />
                    <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      {status.label}
                    </span>
                  </div>

                  <button
                    onClick={() => router.push(`/employees/${emp.id}`)}
                    className="w-full border-2 border-[#c91f41] py-2.5 text-xs font-black uppercase tracking-[0.14em] text-[#c91f41] transition-all duration-300 group-hover:bg-[#c91f41] group-hover:text-white"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex flex-col items-center pt-4">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="rounded-xl bg-gray-900 px-12 py-4 text-xs font-black uppercase tracking-[0.16em] text-white shadow-xl transition hover:bg-[#c91f41] hover:shadow-[#c91f41]/20 dark:bg-white dark:text-black"
          >
            Load More
          </button>
          <p className="mt-3 text-xs font-semibold text-gray-400 dark:text-zinc-500">
            Showing {visibleCount} of {filtered.length} employees
          </p>
        </div>
      )}

      {/* Invite Member Popup */}
      {showInvitePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowInvitePopup(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-black">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41]">
                  Access Control
                </p>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  Employees Directory Access
                </h2>
              </div>
              <button
                onClick={() => setShowInvitePopup(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <Cancel01Icon className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search01Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder="Search by name or email..."
                autoFocus
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#c91f41]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            {/* User List */}
            <div className="max-h-[400px] overflow-y-auto">
              {inviteLoading && inviteUsers.length === 0 ? (
                <div className="py-8 text-center text-sm font-semibold text-gray-400 dark:text-zinc-500">
                  Searching...
                </div>
              ) : inviteUsers.length === 0 ? (
                <div className="py-8 text-center text-sm font-semibold text-gray-400 dark:text-zinc-500">
                  No users found.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/10">
                  {inviteUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ backgroundColor: getAvatarColor(u.name) }}
                        >
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {u.name}
                          </p>
                          {u.department && (
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                              {u.department}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleAccess(u.id, u.hasAccess)}
                        disabled={togglingId === u.id}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition disabled:opacity-50",
                          u.hasAccess
                            ? "border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-zinc-400 dark:hover:border-red-400 dark:hover:text-red-400"
                            : "bg-[#c91f41] text-white hover:bg-[#a01832]"
                        )}
                      >
                        {u.hasAccess ? (
                          <>
                            <Tick01Icon className="h-3 w-3" />
                            Granted
                          </>
                        ) : (
                          "Grant Access"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
