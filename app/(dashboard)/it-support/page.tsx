import { redirect } from "next/navigation";
import { getCurrentUser, canManageITTickets } from "@/lib/permissions";
import { db } from "@/lib/db";
import ITSupportClient from "./ITSupportClient";

export default async function ITSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // All users can see their own tickets; IT staff see all
  let tickets;
  if (canManageITTickets(user)) {
    tickets = await db.iTTicket.findMany({
      include: { user: true, assignedTo: true },
      orderBy: { createdAt: "desc" },
    });
  } else {
    tickets = await db.iTTicket.findMany({
      where: { userId: user.id },
      include: { user: true, assignedTo: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // Get IT department members for assignment
  let itMembers: { id: number; name: string }[] = [];
  if (canManageITTickets(user)) {
    const techDept = await db.department.findFirst({
      where: { slug: "technology" },
    });
    if (techDept) {
      itMembers = await db.user.findMany({
        where: { departmentId: techDept.id, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }
  }

  return (
    <ITSupportClient
      initialTickets={tickets.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        creatorName: t.user.name,
        creatorId: t.userId,
        assigneeName: t.assignedTo?.name || null,
        assigneeId: t.assignedUserId,
        resolvedAt: t.resolvedAt?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
      }))}
      currentUser={{ id: user.id, role: user.role, departmentSlug: user.departmentSlug }}
      isITStaff={canManageITTickets(user)}
      itMembers={itMembers}
    />
  );
}
