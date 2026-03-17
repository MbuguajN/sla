"use server";

import { db } from "@/lib/db";
import { getCurrentUser, canManageITTickets, canAssignITTicket, DEPARTMENTS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

// ============== IT TICKET QUERIES ==============

export async function getITTickets() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // IT staff and admins see all tickets
  if (canManageITTickets(user)) {
    return db.iTTicket.findMany({
      include: {
        user: true,
        assignedTo: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Others see only their own tickets
  return db.iTTicket.findMany({
    where: { userId: user.id },
    include: {
      user: true,
      assignedTo: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getITTicket(ticketId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ticket = await db.iTTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: true,
      assignedTo: true,
    },
  });

  if (!ticket) throw new Error("Ticket not found");

  // Check access
  const canAccess =
    canManageITTickets(user) ||
    ticket.userId === user.id ||
    ticket.assignedUserId === user.id;

  if (!canAccess) throw new Error("Unauthorized");

  return ticket;
}

// ============== TICKET CREATION ==============

export async function createITTicket(data: {
  title: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ticket = await db.iTTicket.create({
    data: {
      userId: user.id,
      title: data.title,
      description: data.description,
      priority: data.priority || "MEDIUM",
      status: "OPEN",
    },
  });

  revalidatePath("/it-support");
  return ticket;
}

// ============== TICKET ASSIGNMENT (IT Manager only) ==============

export async function assignITTicket(ticketId: number, assignedUserId: number) {
  const user = await getCurrentUser();
  if (!user || !canAssignITTicket(user)) {
    throw new Error("Unauthorized - Only IT managers can assign tickets");
  }

  // Verify assignee is in IT department
  const assignee = await db.user.findUnique({
    where: { id: assignedUserId },
    include: { department: true },
  });

  if (!assignee || assignee.department?.slug !== DEPARTMENTS.TECHNOLOGY) {
    throw new Error("Assignee must be in IT department");
  }

  const ticket = await db.iTTicket.update({
    where: { id: ticketId },
    data: {
      assignedUserId,
      status: "ASSIGNED",
    },
  });

  revalidatePath("/it-support");
  revalidatePath(`/it-support/${ticketId}`);
  return ticket;
}

// ============== TICKET STATUS UPDATES ==============

export async function startITTicket(ticketId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ticket = await db.iTTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket not found");

  if (ticket.assignedUserId !== user.id && !canManageITTickets(user)) {
    throw new Error("Unauthorized");
  }

  if (ticket.status !== "ASSIGNED") {
    throw new Error("Ticket must be ASSIGNED to start");
  }

  const updated = await db.iTTicket.update({
    where: { id: ticketId },
    data: { status: "IN_PROGRESS" },
  });

  revalidatePath("/it-support");
  revalidatePath(`/it-support/${ticketId}`);
  return updated;
}

export async function resolveITTicket(ticketId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ticket = await db.iTTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket not found");

  if (ticket.assignedUserId !== user.id && !canManageITTickets(user)) {
    throw new Error("Unauthorized");
  }

  if (ticket.status !== "IN_PROGRESS") {
    throw new Error("Ticket must be IN_PROGRESS to resolve");
  }

  const updated = await db.iTTicket.update({
    where: { id: ticketId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });

  revalidatePath("/it-support");
  revalidatePath(`/it-support/${ticketId}`);
  return updated;
}

export async function closeITTicket(ticketId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ticket = await db.iTTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket not found");

  // Only ticket creator or IT staff can close
  if (ticket.userId !== user.id && !canManageITTickets(user)) {
    throw new Error("Unauthorized");
  }

  if (ticket.status !== "RESOLVED") {
    throw new Error("Ticket must be RESOLVED to close");
  }

  const updated = await db.iTTicket.update({
    where: { id: ticketId },
    data: { status: "CLOSED" },
  });

  revalidatePath("/it-support");
  revalidatePath(`/it-support/${ticketId}`);
  return updated;
}

// ============== REOPEN TICKET ==============

export async function reopenITTicket(ticketId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ticket = await db.iTTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket not found");

  // Only ticket creator can reopen
  if (ticket.userId !== user.id && !canManageITTickets(user)) {
    throw new Error("Unauthorized");
  }

  if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
    throw new Error("Ticket must be RESOLVED or CLOSED to reopen");
  }

  const updated = await db.iTTicket.update({
    where: { id: ticketId },
    data: {
      status: ticket.assignedUserId ? "IN_PROGRESS" : "OPEN",
      resolvedAt: null,
    },
  });

  revalidatePath("/it-support");
  revalidatePath(`/it-support/${ticketId}`);
  return updated;
}
