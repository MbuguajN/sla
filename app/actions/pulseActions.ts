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

  const [
    activityLogs,
    approvedLeaves,
    boardActivities,
    itTickets,
    workspaceJoins,
    pulseComments,
  ] = await Promise.all([
    // Activity logs (task completions, assignments, comments, system events)
    db.activityLog.findMany({
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
    }),

    // Approved leaves (show who's on leave)
    db.leave.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Board card activities
    db.boardCardActivity.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
      },
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
    }),

    // IT ticket updates (resolved recently)
    db.iTTicket.findMany({
      where: {
        status: "RESOLVED",
        updatedAt: { gte: twentyFourHoursAgo },
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),

    // Workspace joins
    db.workspaceMember.findMany({
      where: {
        joinedAt: { gte: twentyFourHoursAgo },
      },
      include: {
        user: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: 5,
    }),

    // Pulse comments
    db.pulseComment.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const items: PulseItem[] = [];

  // Process activity logs
  for (const log of activityLogs) {
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

  // Process approved leaves
  for (const leave of approvedLeaves) {
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

  // Process board card activities
  for (const ca of boardActivities) {
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

  // Process IT tickets
  for (const ticket of itTickets) {
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

  // Process workspace joins
  for (const wj of workspaceJoins) {
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

  // Process pulse comments
  for (const pc of pulseComments) {
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

  // Sort by timestamp descending
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

  // Also create an activity log entry
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
