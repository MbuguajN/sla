import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import EmployeesClient from "./EmployeesClient";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canAccess =
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    user.departmentSlug === "human-resources" ||
    user.privileges.includes("CAN_VIEW_EMPLOYEES");

  if (!canAccess) redirect("/dashboard");

  const canManageAccess =
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    user.departmentSlug === "human-resources";

  const employees = await db.user.findMany({
    where: { isActive: true },
    include: {
      department: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { name: "asc" },
  });

  const employeeIds = employees.map((e) => e.id);

  const [tasks, leaves, documents, currentLeaves] = await Promise.all([
    db.task.groupBy({
      by: ["assignedUserId", "status"],
      where: {
        assignedUserId: { in: employeeIds },
        status: { in: ["DONE", "ASSIGNED", "IN_PROGRESS", "SUBMITTED"] },
      },
      _count: { id: true },
    }),
    db.leave.groupBy({
      by: ["userId", "status"],
      where: {
        userId: { in: employeeIds },
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
      _count: { id: true },
    }),
    db.personalDocument.groupBy({
      by: ["userId"],
      where: { userId: { in: employeeIds } },
      _count: { id: true },
    }),
    db.leave.findMany({
      where: {
        userId: { in: employeeIds },
        status: "APPROVED",
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      select: { userId: true },
    }),
  ]);

  const taskMap = new Map<number, { completed: number; active: number }>();
  for (const t of tasks) {
    if (!t.assignedUserId) continue;
    const entry = taskMap.get(t.assignedUserId) || { completed: 0, active: 0 };
    if (t.status === "DONE") entry.completed += t._count.id;
    else entry.active += t._count.id;
    taskMap.set(t.assignedUserId, entry);
  }

  const leaveMap = new Map<number, { approved: number; pending: number }>();
  for (const l of leaves) {
    const entry = leaveMap.get(l.userId) || { approved: 0, pending: 0 };
    if (l.status === "APPROVED") entry.approved += l._count.id;
    else entry.pending += l._count.id;
    leaveMap.set(l.userId, entry);
  }

  const docMap = new Map<number, number>();
  for (const d of documents) {
    docMap.set(d.userId, d._count.id);
  }

  const onLeaveUserIds = new Set(currentLeaves.map((l) => l.userId));
  const activeCount = employees.length - onLeaveUserIds.size;

  const enriched = employees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    email: emp.email,
    role: emp.role,
    department: emp.department?.name || null,
    departmentSlug: emp.department?.slug || null,
    createdAt: emp.createdAt.toISOString(),
    tasksCompleted: taskMap.get(emp.id)?.completed || 0,
    tasksActive: taskMap.get(emp.id)?.active || 0,
    leavesApproved: leaveMap.get(emp.id)?.approved || 0,
    leavesPending: leaveMap.get(emp.id)?.pending || 0,
    documentsCount: docMap.get(emp.id) || 0,
    isOnLeave: onLeaveUserIds.has(emp.id),
  }));

  const departments = [
    ...new Set(employees.map((e) => e.department?.name).filter(Boolean)),
  ] as string[];

  return (
    <EmployeesClient
      employees={enriched}
      departments={departments}
      currentUserRole={user.role}
      totalCount={employees.length}
      activeCount={activeCount}
      canManageAccess={canManageAccess}
    />
  );
}
