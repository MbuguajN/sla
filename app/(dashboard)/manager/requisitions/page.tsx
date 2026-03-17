import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import ManagerRequisitionsClient from "./ManagerRequisitionsClient";

export default async function ManagerRequisitionsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MANAGER") redirect("/dashboard");

  const requisitions = await db.requisition.findMany({
    where: {
      status: "PENDING_MANAGER",
      user: { departmentId: user.departmentId },
    },
    include: {
      user: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ManagerRequisitionsClient
      initialRequisitions={requisitions.map((r) => ({
        id: r.id,
        title: r.title,
        totalAmount: r.totalAmount,
        status: r.status,
        user: { name: r.user.name },
        items: r.items,
      }))}
    />
  );
}
