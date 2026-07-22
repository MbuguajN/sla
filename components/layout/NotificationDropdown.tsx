"use client";

import { Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUnreadNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead } from "@/app/actions/notificationActions";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const lastUnreadCountRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const syncPermissionState = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    setNotificationPermission(Notification.permission);
  };

  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "default") {
      setNotificationPermission(Notification.permission);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.error("Failed to request notification permission:", error);
    }
  };

  const maybeShowBrowserNotification = (
    latestNotification: Notification | undefined,
    previousUnreadCount: number,
    currentUnreadCount: number
  ) => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (document.visibilityState === "visible") {
      return;
    }

    if (notificationPermission !== "granted") {
      return;
    }

    if (currentUnreadCount <= previousUnreadCount || !latestNotification) {
      return;
    }

    try {
      new Notification(latestNotification.title, {
        body: latestNotification.message,
        tag: `sla-notification-${latestNotification.id}`,
      });
    } catch (error) {
      console.error("Failed to show browser notification:", error);
    }
  };

  useEffect(() => {
    syncPermissionState();
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const previousUnreadCount = lastUnreadCountRef.current;
      const [unread, count] = await Promise.all([
        getUnreadNotifications(),
        getUnreadCount(),
      ]);

      if (hasLoadedOnceRef.current) {
        maybeShowBrowserNotification(unread[0], previousUnreadCount, count);
      } else {
        hasLoadedOnceRef.current = true;
      }

      lastUnreadCountRef.current = count;
      setNotifications(unread);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = async () => {
    await requestBrowserPermission();
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      if (notification.link) {
        setIsOpen(false);
        router.push(notification.link);
      }
    } catch (error) {
      console.error("Failed to open notification:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="p-2 rounded-lg text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-white transition-colors relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c91f41] rounded-full" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10 bg-black/20 md:bg-transparent" onClick={() => setIsOpen(false)} />
          {/* Mobile: bottom sheet. Desktop: dropdown */}
          <div className="fixed bottom-0 left-0 right-0 md:absolute md:right-0 md:bottom-auto md:mt-2 w-full md:w-96 bg-white dark:bg-[#111111] rounded-t-2xl md:rounded-xl shadow-lg dark:shadow-black/60 border border-gray-200 dark:border-white/10 z-20 max-h-[70vh] md:max-h-96 overflow-y-auto">
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-2 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-zinc-600" />
            </div>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-[#111111] border-b border-gray-100 dark:border-white/10 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-400 dark:text-zinc-600">{unreadCount} unread</p>
                )}
                {notificationPermission !== "granted" && (
                  <p className="text-[10px] text-gray-400 dark:text-zinc-600">Alerts are currently disabled</p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-[#c91f41] hover:text-[#a01832] font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications list */}
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-400 dark:text-zinc-600">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-zinc-600">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                      !notification.isRead ? "bg-[#fef2f4] dark:bg-[#c91f41]/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                          notification.isRead ? "bg-gray-300 dark:bg-zinc-700" : "bg-[#c91f41]"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
