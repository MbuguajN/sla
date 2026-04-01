import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import RequisitionsClient from "./RequisitionsClient";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export default async function RequisitionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch existing requisitions
  const requisitions = await db.requisition.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <RealtimeRefresh intervalMs={10000} />
      <RequisitionsClient 
      initialRequisitions={requisitions.map((r) => ({
        id: r.id,
        title: r.title,
        reason: r.reason,
        totalAmount: r.totalAmount,
        status: r.status,
        managerNote: r.managerNote,
        financeNote: r.financeNote,
        ceoNote: r.ceoNote,
        items: r.items.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        createdAt: r.createdAt.toISOString(),
      }))}
    />
    </>
  );
}
