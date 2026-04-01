import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import ManagerRequisitionsClient from "./ManagerRequisitionsClient";

export default async function ManagerRequisitionsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MANAGER") redirect("/dashboard");

  // Manager approval flow has been removed - all requisitions now go directly to Finance
  const requisitions: any[] = [];

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
