import { redirect } from "next/navigation";
import { getCurrentUser, canViewHRData } from "@/lib/permissions";
import { db } from "@/lib/db";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import LeavePolicyClient from "./LeavePolicyClient";

export default async function LeavePolicyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewHRData(user)) redirect("/dashboard");

  const [policies, holidays] = await Promise.all([
    db.leavePolicy.findMany({ orderBy: [{ role: "asc" }, { leaveType: "asc" }] }),
    db.publicHoliday.findMany({ orderBy: { date: "asc" } }),
  ]);

  return (
    <>
      <RealtimeRefresh intervalMs={10000} />
      <LeavePolicyClient
        initialPolicies={policies.map((p) => ({
          id: p.id,
          role: p.role,
          leaveType: p.leaveType,
          daysAllowed: p.daysAllowed,
        }))}
        initialHolidays={holidays.map((h) => ({
          id: h.id,
          name: h.name,
          date: h.date.toISOString(),
        }))}
      />
    </>
  );
}
