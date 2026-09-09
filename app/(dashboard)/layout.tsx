export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { canViewEquipment, getCurrentUser, isAdmin , canViewEmployeeDirectory } from "@/lib/permissions";
import DashboardShell from "@/components/layout/DashboardShell";
import { getCompanyLogos } from "@/app/actions/adminActions";
import { getPlatformLinks } from "@/app/actions/platformActions";
import InactivityLogout from "@/components/InactivityLogout";
import BrowserNotifications from "@/components/BrowserNotifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, logos, platformLinks] = await Promise.all([
    getCurrentUser(),
    getCompanyLogos(),
    getPlatformLinks(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const canAccessEquipment = await canViewEquipment({ id: user.id, role: user.role });
  const canViewEmployees = await canViewEmployeeDirectory(user);

  return (
    <>
      <InactivityLogout timeoutMs={30 * 60 * 1000} />
      <BrowserNotifications />
      <DashboardShell
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentSlug: user.departmentSlug,
          canViewEmployees,
        }}
        platformLinks={platformLinks}
        isAdmin={isAdmin(user)}
        canAccessEquipment={canAccessEquipment}
        logos={logos}
      >
        {children}
      </DashboardShell>
    </>
  );
}
