import { redirect } from "next/navigation";
import { getCurrentUser, canManageRefunds } from "@/lib/permissions";
import { db } from "@/lib/db";
import FinanceRefundsClient from "./FinanceRefundsClient";

export default async function FinanceRefundsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageRefunds(user)) redirect("/dashboard");

  const refunds = await db.refund.findMany({
    include: { user: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <FinanceRefundsClient
      initialRefunds={refunds.map((r) => ({
        id: r.id,
        amount: r.amount,
        reason: r.reason,
        status: r.status,
        userName: r.user.name,
        userDepartment: r.user.department?.name || null,
        financeNote: r.financeNote,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
