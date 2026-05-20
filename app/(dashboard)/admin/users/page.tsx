import { redirect } from "next/navigation";
import { getCurrentUser, canManageUsers } from "@/lib/permissions";
import { db } from "@/lib/db";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageUsers(user)) redirect("/dashboard");

  const [users, departments] = await Promise.all([
    db.user.findMany({
      include: { department: true, heldPrivileges: true },
      orderBy: { createdAt: "desc" },
    }),
    db.department.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <UsersClient
      initialUsers={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        departmentId: u.departmentId,
        departmentName: u.department?.name || null,
        privileges: u.heldPrivileges.map((entry) => entry.privilege),
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      }))}
      departments={departments.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
      }))}
    />
  );
}
