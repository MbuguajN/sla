import { redirect } from "next/navigation";
import { getCurrentUser, canViewFinanceData } from "@/lib/permissions";
import { db } from "@/lib/db";
import FinanceRequisitionsClient from "./FinanceRequisitionsClient";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export default async function FinanceRequisitionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewFinanceData(user)) redirect("/dashboard");

  const requisitions = await db.requisition.findMany({
    include: {
      user: { include: { department: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <RealtimeRefresh intervalMs={10000} />
      <FinanceRequisitionsClient
      initialRequisitions={requisitions.map((r) => ({
        id: r.id,
        title: r.title,
        reason: r.reason,
        totalAmount: r.totalAmount,
        status: r.status,
        userName: r.user.name,
        userDepartment: r.user.department?.name || null,
        managerNote: r.managerNote,
        financeNote: r.financeNote,
        ceoNote: r.ceoNote,
        items: r.items.map((i) => ({
          id: i.id,
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          vatInclusive: i.vatInclusive,
        })),
        createdAt: r.createdAt.toISOString(),
      }))}
      currentUserRole={user.role}
    />
    </>
  );
}
