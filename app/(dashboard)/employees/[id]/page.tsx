import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import EmployeeProfileClient from "./EmployeeProfileClient";

export const dynamic = "force-dynamic";

export default async function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const employeeId = parseInt(params.id);
  if (isNaN(employeeId)) notFound();

  const employee = await db.user.findUnique({
    where: { id: employeeId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      department: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!employee) notFound();

  const canAccess =
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    user.departmentSlug === "human-resources" ||
    user.privileges.includes("CAN_VIEW_EMPLOYEES") ||
    user.id === employeeId;

  if (!canAccess) redirect("/dashboard");

  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const now = new Date();
  const currentQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const lastQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
  const lastQuarterEnd = currentQuarterStart;

  const [tasks, leavePolicies, leaves, documents, completedThisQuarter, completedLastQuarter] = await Promise.all([
    db.task.groupBy({
      by: ["status"],
      where: {
        assignedUserId: employeeId,
        status: { notIn: ["CANCELLED"] },
      },
      _count: { id: true },
    }),
    db.leavePolicy.findMany({
      where: { role: employee.role },
      select: { leaveType: true, daysAllowed: true },
    }),
    db.leave.findMany({
      where: {
        userId: employeeId,
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { gte: yearStart },
      },
      select: { type: true, status: true, totalDays: true },
    }),
    db.personalDocument.findMany({
      where: { userId: employeeId },
      select: { id: true, name: true, url: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.task.count({
      where: {
        assignedUserId: employeeId,
        status: "DONE",
        completedAt: { gte: currentQuarterStart },
      },
    }),
    db.task.count({
      where: {
        assignedUserId: employeeId,
        status: "DONE",
        completedAt: { gte: lastQuarterStart, lt: lastQuarterEnd },
      },
    }),
  ]);

  const completedTasks = tasks.find((t) => t.status === "DONE")?._count.id || 0;
  const activeTasks = tasks
    .filter((t) => !["DONE", "CANCELLED"].includes(t.status))
    .reduce((sum, t) => sum + t._count.id, 0);

  const policyMap = new Map(leavePolicies.map((p) => [p.leaveType, p.daysAllowed]));
  const usedMap = new Map<string, number>();
  for (const l of leaves) {
    usedMap.set(l.type, (usedMap.get(l.type) || 0) + l.totalDays);
  }

  const leaveBalances = [
    { type: "ANNUAL_LEAVE", label: "Annual Leave", color: "bg-[#c91f41]" },
    { type: "SICKNESS_LEAVE", label: "Sick Leave", color: "bg-emerald-600" },
    { type: "COMPASSIONATE_LEAVE", label: "Compassionate", color: "bg-blue-600" },
    { type: "MATERNITY", label: "Maternity", color: "bg-amber-600" },
    { type: "PATERNITY", label: "Paternity", color: "bg-purple-600" },
    { type: "TOIL", label: "TOIL", color: "bg-teal-600" },
  ]
    .map((item) => {
      const allowed = policyMap.get(item.type as any) || 0;
      if (allowed === 0) return null;
      const used = usedMap.get(item.type) || 0;
      return {
        ...item,
        used,
        allowed,
        remaining: allowed - used,
        percentage: Math.round((used / allowed) * 100),
      };
    })
    .filter(Boolean);

  return (
    <EmployeeProfileClient
      employee={{
        ...employee,
        createdAt: employee.createdAt.toISOString(),
      }}
      completedTasks={completedTasks}
      activeTasks={activeTasks}
      leaveBalances={leaveBalances as any}
      documents={documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      }))}
      currentUserId={user.id}
      currentUserRole={user.role}
    />
  );
}
