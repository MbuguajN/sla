"use server";

import db from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { NotificationType } from "@prisma/client";

const VALID_TYPES = new Set(Object.values(NotificationType) as string[]);

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  // Callers pass the type as a plain string. An unknown value used to reach
  // Prisma and throw, taking down whatever action was creating the notification.
  const safeType = (VALID_TYPES.has(type) ? type : "SYSTEM") as NotificationType;
  if (safeType !== type) {
    console.warn(`Unknown notification type "${type}" — falling back to SYSTEM`);
  }

  const result = await db.notification.create({
    data: {
      userId,
      type: safeType,
      title,
      message,
      link,
    },
  });
  return {
    id: result.id,
    userId: result.userId,
    type: result.type,
    title: result.title,
    message: result.message,
    link: result.link,
    isRead: result.isRead,
    createdAt: result.createdAt.toISOString()
  };
}

export async function getUnreadNotifications() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return db.notification.findMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });
}

export async function getAllNotifications() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return db.notification.findMany({
    where: { userId: user.id },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}

export async function markNotificationAsRead(notificationId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });

  return { success: true };
}

export async function markAllNotificationsAsRead() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return db.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: { isRead: true },
  });
}

export async function getUnreadCount() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return db.notification.count({
    where: {
      userId: user.id,
      isRead: false,
    },
  });
}
