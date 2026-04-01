import { redirect, notFound } from "next/navigation";
import { getCurrentUser, canManageLeaves } from "@/lib/permissions";
import { db } from "@/lib/db";
import HRLeaveDetailClient from "./HRLeaveDetailClient";

export default async function HRLeaveDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageLeaves(user)) redirect("/dashboard");

  const leaveId = parseInt(params.id, 10);
  if (isNaN(leaveId)) notFound();

  const leave = await db.leave.findUnique({
    where: { id: leaveId },
    include: {
      user: {
        include: { department: true },
      },
    },
  });

  if (!leave) notFound();

  return (
    <HRLeaveDetailClient
      leave={{
        id: leave.id,
        userId: leave.userId,
        userName: leave.user.name,
        userEmail: leave.user.email,
        userRole: leave.user.role,
        userDepartment: leave.user.department?.name || null,
        type: leave.type,
        startDate: leave.startDate.toISOString(),
        endDate: leave.endDate.toISOString(),
        totalDays: leave.totalDays,
        reason: leave.reason,
        status: leave.status,
        reviewNote: leave.reviewNote,
        createdAt: leave.createdAt.toISOString(),
        updatedAt: leave.updatedAt.toISOString(),
      }}
    />
  );
}
