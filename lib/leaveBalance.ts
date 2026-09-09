import { db } from "@/lib/db";
import type { LeaveType, Role } from "@prisma/client";

/**
 * Statuses that consume entitlement.
 *
 * PENDING_HR must be included: once a manager has approved, the request is
 * still live and must keep counting against the balance. Leaving it out let an
 * employee over-book during the window between manager approval and HR review.
 */
export const LEAVE_CONSUMING_STATUSES = ["PENDING", "PENDING_HR", "APPROVED"] as const;

export function leaveYearBounds(year = new Date().getFullYear()) {
  return {
    yearStart: new Date(year, 0, 1),
    yearEnd: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

/**
 * Days allowed per leave type for a user: the role policy, overridden per user
 * by UserLeaveOverride where one exists.
 *
 * Both createLeave and every balance display go through this, so the number the
 * employee is shown is the number the application form enforces.
 */
export async function getLeaveEntitlements(
  userId: number,
  role: Role
): Promise<Map<LeaveType, number>> {
  const [policies, overrides] = await Promise.all([
    db.leavePolicy.findMany({ where: { role } }),
    db.userLeaveOverride.findMany({ where: { userId } }),
  ]);

  const entitlements = new Map<LeaveType, number>();
  for (const policy of policies) entitlements.set(policy.leaveType, policy.daysAllowed);
  for (const override of overrides) entitlements.set(override.leaveType, override.daysAllowed);

  return entitlements;
}

/**
 * Days already committed this leave year, per leave type.
 */
export async function getLeaveUsage(
  userId: number,
  year = new Date().getFullYear()
): Promise<Map<LeaveType, number>> {
  const { yearStart, yearEnd } = leaveYearBounds(year);

  const grouped = await db.leave.groupBy({
    by: ["type"],
    where: {
      userId,
      status: { in: [...LEAVE_CONSUMING_STATUSES] },
      startDate: { gte: yearStart, lte: yearEnd },
    },
    _sum: { totalDays: true },
  });

  const usage = new Map<LeaveType, number>();
  for (const row of grouped) usage.set(row.type, row._sum.totalDays ?? 0);

  return usage;
}
