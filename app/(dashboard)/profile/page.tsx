import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { Role } from "@prisma/client";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      department: { select: { id: true, name: true, slug: true } },
      employmentDate: true,
      maritalStatus: true,
      gender: true,
      phoneNumber: true,
      address: true,
      dateOfBirth: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      emergencyContactRelation: true,
    },
  });

  if (!profile) redirect("/login");

  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [tasks, boardCards, leavePolicies, leaves, documents, companyItems, leaveOverrides] = await Promise.all([
    db.task.groupBy({
      by: ["status"],
      where: {
        assignedUserId: user.id,
        status: { notIn: ["CANCELLED"] },
      },
      _count: { id: true },
    }),
    db.boardCard.groupBy({
      by: ["isCompleted"],
      where: {
        assignedToUserId: user.id,
      },
      _count: { id: true },
    }),
    db.leavePolicy.findMany({
      where: { role: user.role as Role },
      select: { leaveType: true, daysAllowed: true },
    }),
    db.leave.findMany({
      where: {
        userId: user.id,
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { gte: yearStart },
      },
      select: { type: true, status: true, totalDays: true },
    }),
    db.personalDocument.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, url: true, category: true, accessLevel: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.equipmentItem.findMany({
      where: { ownerUserId: user.id },
      select: { id: true, make: true, model: true, serialNumber: true, category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.userLeaveOverride.findMany({
      where: { userId: user.id },
      select: { leaveType: true, daysAllowed: true },
    }),
  ]);

  const completedTasks = tasks.find((t) => t.status === "DONE")?._count.id || 0;
  const activeTasks = tasks
    .filter((t) => !["DONE", "CANCELLED"].includes(t.status))
    .reduce((sum, t) => sum + t._count.id, 0);

  const completedBoardCards = boardCards.find((c) => c.isCompleted === true)?._count.id || 0;
  const activeBoardCards = boardCards.find((c) => c.isCompleted === false)?._count.id || 0;

  const totalCompleted = completedTasks + completedBoardCards;
  const totalActive = activeTasks + activeBoardCards;

  const policyMap = new Map(leavePolicies.map((p) => [p.leaveType, p.daysAllowed]));
  const overrideMap = new Map(leaveOverrides.map((o) => [o.leaveType, o.daysAllowed]));
  const usedMap = new Map<string, number>();
  for (const l of leaves) {
    usedMap.set(l.type, (usedMap.get(l.type) || 0) + l.totalDays);
  }

  const allLeaveTypes = [
    { type: "ANNUAL_LEAVE", label: "Annual Leave", color: "bg-[#c91f41]" },
    { type: "SICKNESS_LEAVE", label: "Sick Leave", color: "bg-emerald-600" },
    { type: "COMPASSIONATE_LEAVE", label: "Compassionate", color: "bg-blue-600" },
    { type: "MATERNITY", label: "Maternity", color: "bg-amber-600" },
    { type: "PATERNITY", label: "Paternity", color: "bg-purple-600" },
    { type: "TOIL", label: "TOIL", color: "bg-teal-600" },
  ];

  const genderLower = profile.gender?.toLowerCase() || "";

  const leaveBalances = allLeaveTypes
    .map((item) => {
      const allowed = (overrideMap.get(item.type as any) ?? policyMap.get(item.type as any)) || 0;
      if (allowed === 0) return null;

      // Gender filtering: males only see Paternity, females only see Maternity
      if (item.type === "PATERNITY" && genderLower !== "male") return null;
      if (item.type === "MATERNITY" && genderLower !== "female") return null;

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
    <ProfileClient
      profile={{
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        employmentDate: profile.employmentDate?.toISOString() || null,
        dateOfBirth: profile.dateOfBirth?.toISOString() || null,
      }}
      completedTasks={totalCompleted}
      activeTasks={totalActive}
      leaveBalances={leaveBalances as any}
      documents={documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      }))}
      companyItems={companyItems.map((i) => ({
        id: i.id,
        name: `${i.make} ${i.model}`,
        category: i.category?.name || null,
        serialNumber: i.serialNumber,
      }))}
      currentRole={user.role}
      currentDepartmentSlug={user.departmentSlug || ""}
    />
  );
}
