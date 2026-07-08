import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import ManagerLeavesClient from "./ManagerLeavesClient";

export default async function ManagerLeavesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "MANAGER") redirect("/dashboard");

  const leaves = await db.leave.findMany({
    where: {
      user: { departmentId: user.departmentId },
    },
    include: { user: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <RealtimeRefresh intervalMs={10000} />
      <ManagerLeavesClient
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
      />
    </>
  );
}
