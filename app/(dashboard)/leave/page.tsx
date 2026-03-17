import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import LeaveClient from "./LeaveClient";

export default async function LeavePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const leaves = await db.leave.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <LeaveClient
      initialLeaves={leaves.map((l) => ({
        id: l.id,
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
