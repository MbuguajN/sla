import { redirect } from "next/navigation";
import { getCurrentUser, canManageLeaves } from "@/lib/permissions";
import { db } from "@/lib/db";
import HRLeavesClient from "./HRLeavesClient";

export default async function HRLeavesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageLeaves(user)) redirect("/dashboard");

  const leaves = await db.leave.findMany({
    include: { user: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <HRLeavesClient
      initialLeaves={leaves.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.user.name,
        userDepartment: l.user.department?.name || null,
        type: l.type,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        totalDays: l.totalDays,
        reason: l.reason,
        status: l.status,
        reviewNote: l.reviewNote,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
