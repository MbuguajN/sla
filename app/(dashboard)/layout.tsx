import { redirect } from "next/navigation";
import { canViewEquipment, getCurrentUser } from "@/lib/permissions";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { getCompanyLogos } from "@/app/actions/adminActions";
import InactivityLogout from "@/components/InactivityLogout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, logos] = await Promise.all([
    getCurrentUser(),
    getCompanyLogos(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const canAccessEquipment = await canViewEquipment({ id: user.id, role: user.role });

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-black">
      <InactivityLogout timeoutMs={30 * 60 * 1000} />
      <Sidebar
        user={{
          name: user.name,
          role: user.role,
          departmentSlug: user.departmentSlug,
        }}
        canAccessEquipment={canAccessEquipment}
        logos={logos}
      />
      <div className="pl-64">
        <Header
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentSlug: user.departmentSlug,
          }}
        />
        <main className="p-8 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
