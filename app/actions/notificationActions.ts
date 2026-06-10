"use server";

import db from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  const result = await db.notification.create({
    data: {
      userId,
      type: type as any,
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
