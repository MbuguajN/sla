"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DashboardSquare01Icon,
  Book01Icon,
  Briefcase02Icon,
  TaskDone01Icon,
  Building01Icon,
  UserGroupIcon,
  Settings02Icon,
  Calendar01Icon,
  Message01Icon,
  Invoice01Icon,
  CreditCardIcon,
  ArrowDown01Icon,
  HelpCircleIcon,
  PackageIcon,
  UserEdit01Icon,
  Settings01Icon,
} from "@hugeicons/react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProps {
  user: {
    name: string;
    role: string;
    departmentSlug: string | null;
    privileges?: string[];
  };
  canAccessEquipment?: boolean;
  logos?: { light: string | null; dark: string | null } | null;
}

export default function Sidebar({ user, canAccessEquipment = false, logos }: SidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(["personal", "hr", "finance", "it", "admin"]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const toggleSection = (s: string) =>
    setExpandedSections((p) =>
      p.includes(s) ? p.filter((x) => x !== s) : [...p, s]
    );

  const canAccessHR =
    user.role === "ADMIN" || user.role === "CEO" || user.departmentSlug === "human-resources";
  const isHROnly = user.departmentSlug === "human-resources" && user.role === "EMPLOYEE" || user.departmentSlug === "human-resources" && user.role === "MANAGER";
  const canAccessFinance =
    user.role === "ADMIN" || user.role === "CEO" || user.departmentSlug === "finance";
  const canAccessRequisitionReview = canAccessFinance || user.role === "MANAGER";
  const isFinanceOnly = user.departmentSlug === "finance" && (user.role === "EMPLOYEE" || user.role === "MANAGER");
  const canAccessAdmin = user.role === "ADMIN";
  const canSeeProjectsAndTasks = !isHROnly;
  const canSeeClients =
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    user.role === "MANAGER" ||
    user.departmentSlug === "finance" ||
    user.departmentSlug === "business-development" ||
    user.departmentSlug === "client-service";

  // Main nav items
  const mainNav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: DashboardSquare01Icon },
    ...(user.role === "ADMIN" || user.role === "CEO" || user.departmentSlug === "human-resources" || user.privileges?.includes("CAN_VIEW_EMPLOYEES")
      ? [{ label: "Employees", href: "/employees", icon: UserGroupIcon }]
      : []),
    ...(user.role === "ADMIN" || user.role === "CEO"
      ? [{ label: "Reports", href: "/reports", icon: Book01Icon }]
      : []),
    ...(canSeeClients ? [{ label: "Clients", href: "/clients", icon: UserGroupIcon }] : []),
    ...(canSeeProjectsAndTasks ? [{ label: "Board", href: "/board", icon: UserGroupIcon }] : []),
    ...(canSeeProjectsAndTasks ? [{ label: "Projects", href: "/projects", icon: Briefcase02Icon }] : []),
    ...(canSeeProjectsAndTasks ? [{ label: "Tasks", href: "/tasks", icon: TaskDone01Icon }] : []),
    ...(!isHROnly ? [{ label: "Daily Log", href: "/daily-log", icon: Calendar01Icon }] : []),
  ];

  // Sections (collapsible)
  const Sections = [
    {
      id: "personal",
      title: "Personal",
      visible: true,
      items: [
        { label: "My Leaves", href: "/leave", icon: Calendar01Icon },
        { label: "Suggestions", href: "/suggestions", icon: Message01Icon },
        { label: "Requisitions", href: "/requisitions", icon: Invoice01Icon },
        { label: "Refunds", href: "/refunds", icon: CreditCardIcon },
        { label: "Settings", href: "/profile", icon: Settings01Icon },
      ]
    },
    {
      id: "hr",
      title: "HR Management",
      visible: canAccessHR,
      items: [
        { label: "All Leaves", href: "/hr/leaves", icon: Calendar01Icon },
        { label: "Suggestions", href: "/hr/suggestions", icon: Message01Icon },
        { label: "Leave Policies", href: "/hr/leave-policy", icon: Settings02Icon },
      ]
    },
    {
      id: "finance",
      title: "Finance",
      visible: canAccessRequisitionReview,
      items: [
        ...(canAccessRequisitionReview ? [{ label: "Requisitions", href: "/finance/requisitions", icon: Invoice01Icon }] : []),
        ...(canAccessFinance ? [{ label: "Refunds", href: "/finance/refunds", icon: CreditCardIcon }] : []),
      ]
    },
    {
      id: "it",
      title: "IT Support",
      visible: true,
      items: [
        { label: "Tickets", href: "/it-support", icon: HelpCircleIcon },
        ...(canAccessEquipment ? [{ label: "Equipment", href: "/equipment", icon: PackageIcon }] : []),
      ]
    },
    {
      id: "admin",
      title: "Administration",
      visible: canAccessAdmin,
      items: [
        { label: "Users", href: "/admin/users", icon: UserEdit01Icon },
        { label: "Departments", href: "/admin/departments", icon: Building01Icon },
        { label: "Logs", href: "/admin/logs", icon: Book01Icon },
        { label: "App Settings", href: "/admin/settings", icon: Settings01Icon },
      ]
    }
  ];

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrator",
    CEO: "Director",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-black z-30 flex flex-col transition-all duration-300 border-r border-gray-100 dark:border-white/10">
      {/* Sidebar Logo wrapper */}
      <div className="h-24 flex items-center justify-center px-4">
        <Link href="/dashboard" className="flex items-center justify-center gap-3 group w-full">
          {logos?.light ? (
            <div className="relative">
              <img 
                src={logos.light} 
                alt="Logo" 
                className="h-14 w-auto object-contain dark:hidden transition-transform duration-300 group-hover:scale-105" 
              />
              {logos.dark && (
                <img 
                  src={logos.dark} 
                  alt="Logo" 
                  className="h-14 w-auto object-contain hidden dark:block transition-transform duration-300 group-hover:scale-105" 
                />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-[#c91f41] flex items-center justify-center shadow-lg shadow-[#c91f41]/20 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                <Building01Icon className="text-white h-7 w-7" />
              </div>
              <span className="font-black text-2xl tracking-tighter text-gray-900 dark:text-white">SLA<span className="text-[#c91f41]">.</span></span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {mainNav.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {Sections.filter(s => s.visible).map(section => (
          <SidebarSection
            key={section.id}
            title={section.title}
            items={section.items}
            expanded={expandedSections.includes(section.id)}
            onToggle={() => toggleSection(section.id)}
            isActive={isActive}
          />
        ))}
      </nav>

      {/* Bottom user section */}
      <div className="p-4 border-t border-gray-50 dark:border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
          <div className="w-10 h-10 rounded-xl bg-[#fff1f2] flex items-center justify-center shrink-0 border border-white shadow-sm overflow-hidden">
             <span className="text-[#c91f41] text-sm font-bold">
               {user?.name?.[0]?.toUpperCase() || "U"}
             </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">{user?.name || "User"}</p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-500 truncate font-medium uppercase tracking-wider">{roleLabel[user.role] || user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
        active
          ? "bg-[#fff1f2] dark:bg-[#c91f41]/15 text-[#c91f41]"
          : "text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
      )}
    >
      <Icon className={cn("h-[20px] w-[20px] transition-all duration-300", active ? "text-[#c91f41]" : "text-gray-400 dark:text-zinc-600")} />
      {item.label}
    </Link>
  );
}

function SidebarSection({
  title,
  items,
  expanded,
  onToggle,
  isActive,
}: {
  title: string;
  items: NavItem[];
  expanded: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="pt-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-zinc-700 hover:text-gray-600 dark:hover:text-zinc-500 transition-colors"
      >
        {title}
        <ArrowDown01Icon
          className={cn("h-3.5 w-3.5 transition-transform duration-300", expanded && "rotate-180")}
        />
      </button>
      <div 
        className={cn(
          "space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-[500px] mt-1 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {items.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>
    </div>
  );
}



