import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import Link from "next/link";
import { Users, Building2, Settings, ArrowRight } from "lucide-react";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [totalUsers, activeUsers, totalDepartments] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.department.count(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <QuickLink
          title="Manage Users"
          description="Create, edit, and manage user accounts"
          href="/admin/users"
          icon={Users}
        />
        <QuickLink
          title="Departments"
          description="View and manage department settings"
          href="/admin/departments"
          icon={Building2}
        />
        <QuickLink
          title="System Settings"
          description="Configure system-wide settings"
          href="/admin/settings"
          icon={Settings}
        />
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
    <div className="bg-white rounded-xl border border-gray-200 border-l-[3px] border-l-[#c91f41] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-400 mt-1">{subtext}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#c91f41]" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-[#c91f41]/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center mb-4">
          <Icon className="h-5 w-5 text-[#c91f41]" />
        </div>
        <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-[#c91f41] transition-colors" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-400 mt-1">{description}</p>
    </Link>
  );
}
