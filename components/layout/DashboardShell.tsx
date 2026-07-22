"use client";

import { useState, useCallback } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

interface DashboardShellProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    departmentSlug: string | null;
    privileges?: string[];
  };
  platformLinks: any[];
  isAdmin: boolean;
  canAccessEquipment: boolean;
  logos?: { light: string | null; dark: string | null } | null;
  children: React.ReactNode;
}

export default function DashboardShell({
  user,
  platformLinks,
  isAdmin,
  canAccessEquipment,
  logos,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-black">
      <Sidebar
        user={{
          name: user.name,
          role: user.role,
          departmentSlug: user.departmentSlug,
          privileges: user.privileges,
        }}
        canAccessEquipment={canAccessEquipment}
        logos={logos}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />
      <div className="md:pl-64">
        <Header
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentSlug: user.departmentSlug,
          }}
          platformLinks={platformLinks}
          isAdmin={isAdmin}
          onMenuToggle={toggleMobile}
        />
        <main className="p-4 md:p-8 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
