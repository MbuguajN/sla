"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export type PulseItem = {
  id: string;
  type: "activity" | "leave" | "board_activity" | "it_ticket" | "workspace_join" | "comment";
  category: "task" | "team" | "system";
  message: string;
  userName: string;
  userId: number | null;
  timestamp: string;
};

export async function getCompanyPulse(): Promise<PulseItem[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const items: PulseItem[] = [];

  // Each query is independent — if one fails, others still work
  try {
    const logs = await db.activityLog.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        isHiddenFromDashboard: false,
        type: { not: "COMMENTED" },
      },
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    for (const log of logs) {
      const userName = log.user?.name || "System";
      const taskTitle = log.task?.title;
      let message = log.description;
      if (taskTitle) message = `${message} — ${taskTitle}`;
      let category: "task" | "team" | "system" = "task";
      if (log.description.toLowerCase().includes("leave")) category = "team";
      if (log.description.toLowerCase().includes("system") || log.description.toLowerCase().includes("maintenance")) category = "system";
      items.push({
        id: `activity-${log.id}`,
        type: "activity",
        category,
        message,
        userName,
        userId: log.user?.id || null,
        timestamp: log.createdAt.toISOString(),
      });
    }
  } catch {}

  try {
    const leaves = await db.leave.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    for (const leave of leaves) {
      const start = new Date(leave.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const end = new Date(leave.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      items.push({
        id: `leave-${leave.id}`,
        type: "leave",
        category: "team",
        message: `${leave.user.name} is on leave from ${start} – ${end}`,
        userName: leave.user.name,
        userId: leave.user.id,
        timestamp: leave.createdAt.toISOString(),
      });
    }
  } catch {}

  try {
    const boards = await db.boardCardActivity.findMany({
      where: { createdAt: { gte: twentyFourHoursAgo } },
      include: {
        card: {
          select: {
            id: true,
            title: true,
            list: { include: { board: { select: { title: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    for (const ca of boards) {
      items.push({
        id: `board-${ca.id}`,
        type: "board_activity",
        category: "task",
        message: ca.message,
        userName: ca.actorName,
        userId: null,
        timestamp: ca.createdAt.toISOString(),
      });
    }
  } catch {}

  try {
    const tickets = await db.iTTicket.findMany({
      where: {
        status: "RESOLVED",
        updatedAt: { gte: twentyFourHoursAgo },
      },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    for (const ticket of tickets) {
      items.push({
        id: `it-${ticket.id}`,
        type: "it_ticket",
        category: "system",
        message: `IT ticket "${ticket.title}" resolved`,
        userName: ticket.assignedTo?.name || "IT Team",
        userId: ticket.assignedTo?.id || null,
        timestamp: ticket.updatedAt.toISOString(),
      });
    }
  } catch {}

  try {
    const joins = await db.workspaceMember.findMany({
      where: { joinedAt: { gte: twentyFourHoursAgo } },
      include: {
        user: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: 5,
    });
    for (const wj of joins) {
      items.push({
        id: `ws-${wj.id}`,
        type: "workspace_join",
        category: "team",
        message: `${wj.user.name} joined workspace "${wj.workspace.name}"`,
        userName: wj.user.name,
        userId: wj.user.id,
        timestamp: wj.joinedAt.toISOString(),
      });
    }
  } catch {}

  try {
    const comments = await db.pulseComment.findMany({
      where: { createdAt: { gte: twentyFourHoursAgo } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    for (const pc of comments) {
      items.push({
        id: `comment-${pc.id}`,
        type: "comment",
        category: "system",
        message: pc.content,
        userName: pc.user.name,
        userId: pc.user.id,
        timestamp: pc.createdAt.toISOString(),
      });
    }
  } catch {}

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 30);
}

export async function postPulseComment(content: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (!content.trim()) throw new Error("Comment cannot be empty");

  const comment = await db.pulseComment.create({
    data: {
      userId: user.id,
      content: content.trim(),
    },
  });

  await db.activityLog.create({
    data: {
      type: "COMMENTED",
      description: `${user.name} posted: ${content.trim()}`,
      userId: user.id,
    },
  });

  revalidatePath("/");
  return comment;
}
