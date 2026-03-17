import { redirect } from "next/navigation";
import { getCurrentUser, canManageUsers } from "@/lib/permissions";
import { db } from "@/lib/db";
import DepartmentsClient from "./DepartmentsClient";

export default async function DepartmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageUsers(user)) redirect("/dashboard");

  const [departments, users] = await Promise.all([
    db.department.findMany({
      include: {
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DepartmentsClient
      initialDepartments={departments.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        headId: d.headId,
        headName: d.head?.name || null,
        memberCount: d._count.members,
      }))}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      }))}
    />
  );
}
