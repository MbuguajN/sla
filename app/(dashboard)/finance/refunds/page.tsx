import { redirect } from "next/navigation";
import { getCurrentUser, canManageRefunds } from "@/lib/permissions";
import { db } from "@/lib/db";
import FinanceRefundsClient from "./FinanceRefundsClient";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export default async function FinanceRefundsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageRefunds(user)) redirect("/dashboard");

  const refunds = await db.refund.findMany({
    include: { user: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <RealtimeRefresh intervalMs={10000} />
      <FinanceRefundsClient
        initialRefunds={refunds.map((r) => ({
          id: r.id,
          amount: r.amount,
          reason: r.reason,
          receiptUrls: r.receiptUrls,
          status: r.status,
          userName: r.user.name,
          userDepartment: r.user.department?.name || null,
          financeNote: r.financeNote,
          ceoNote: r.ceoNote,
          createdAt: r.createdAt.toISOString(),
        }))}
        currentUserRole={user.role}
      />
    </>
  );
}
