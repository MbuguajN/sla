import { redirect } from "next/navigation";
import { getCurrentUser, canManageLeaves } from "@/lib/permissions";
import { db } from "@/lib/db";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import HRLeavesClient from "./HRLeavesClient";

export default async function HRLeavesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageLeaves(user)) redirect("/dashboard");

  const leaves = await db.leave.findMany({
    where: {
      status: { in: ["PENDING_HR", "APPROVED", "DENIED", "CANCELLED"] },
    },
    include: { user: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <RealtimeRefresh intervalMs={10000} />
      <HRLeavesClient
        initialLeaves={leaves.map((l) => ({
          id: l.id,
          userId: l.userId,
          userName: l.user.name,
          userDepartment: l.user.department?.name || null,
          type: l.type,
          duration: l.duration,
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
          totalDays: l.totalDays,
          reason: l.reason,
          status: l.status,
          reviewNote: l.reviewNote,
          createdAt: l.createdAt.toISOString(),
        }))}
        viewOnly={user.role === "ADMIN"}
      />
    </>
  );
}
