import { redirect } from "next/navigation";
import { getCurrentUser, canManageUsers } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManageUsers(user)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
