import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import RefundsClient from "./RefundsClient";

export default async function RefundsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const refunds = await db.refund.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <RefundsClient
      initialRefunds={refunds.map((r) => ({
        id: r.id,
        amount: r.amount,
        reason: r.reason,
        status: r.status,
        financeNote: r.financeNote,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
