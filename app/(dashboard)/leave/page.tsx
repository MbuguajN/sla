import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getLeaveEntitlements, getLeaveUsage } from "@/lib/leaveBalance";
import type { Role } from "@prisma/client";
import LeaveClient from "./LeaveClient";
import { processLeaveTaskHandovers } from "@/app/actions/leaveHandoverActions";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await processLeaveTaskHandovers();

  const userRole = user.role as "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE";

  const [leaves, publicHolidays, activeTasks, departmentMembers] = await Promise.all([
    db.leave.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        duration: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        status: true,
        reason: true,
        reviewNote: true,
        createdAt: true,
        handovers: {
          include: {
            task: { select: { id: true, title: true } },
            delegateUser: { select: { id: true, name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.publicHoliday.findMany({
      orderBy: { date: "asc" },
    }),
    db.task.findMany({
      where: {
        assignedUserId: user.id,
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      include: {
        project: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    user.departmentId
      ? db.user.findMany({
          where: {
            departmentId: user.departmentId,
            isActive: true,
            id: { not: user.id },
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);
  // Entitlements and usage come from the same helpers createLeave enforces, so
  // the balance shown here can never disagree with what the form accepts:
  // per-user overrides are honoured, and PENDING_HR counts as committed.
  const [entitlements, usage] = await Promise.all([
    getLeaveEntitlements(user.id, user.role as Role),
    getLeaveUsage(user.id),
  ]);

  const leaveBalances = Array.from(entitlements.entries()).map(([type, daysAllowed]) => {
    const usedDays = usage.get(type) ?? 0;

    return {
      type,
      daysAllowed,
      usedDays,
      remainingDays: Math.max(daysAllowed - usedDays, 0),
    };
  });

  return (
    <>
      <RealtimeRefresh intervalMs={10000} />
      <LeaveClient
        initialLeaves={leaves.map((l) => ({
          id: l.id,
          type: l.type,
          duration: l.duration,
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
          totalDays: l.totalDays,
          reason: l.reason,
          status: l.status,
          reviewNote: l.reviewNote,
          createdAt: l.createdAt.toISOString(),
          handovers: l.handovers.map((handover) => ({
            taskId: handover.taskId,
            taskTitle: handover.task.title,
            delegateUserId: handover.delegateUserId,
            delegateUserName: handover.delegateUser.name,
            status: handover.status,
          })),
        }))}
        leaveBalances={leaveBalances}
        holidayDates={publicHolidays.map((h) => h.date.toISOString())}
        activeTasks={activeTasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          projectTitle: task.project.title,
        }))}
        departmentMembers={departmentMembers}
      />
    </>
  );
}
