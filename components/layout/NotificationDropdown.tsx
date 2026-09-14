"use client";

import { Bell, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  // The panel is portalled to <body>, which only exists after mount.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
      const [unread, count] = await Promise.all([
        getUnreadNotifications(),
        getUnreadCount(),
      ]);

      setNotifications(unread);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const bellRef = useRef<HTMLButtonElement | null>(null);
  const [bellRect, setBellRect] = useState<{ right: number; top: number } | null>(null);

  const updateBellPosition = () => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setBellRect({ right: window.innerWidth - rect.right, top: rect.bottom + 8 });
    }
  };

  const handleBellClick = async () => {
    await requestBrowserPermission();
    if (!isOpen) {
      updateBellPosition();
    }
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

  // A bottom sheet that leaves the page scrolling behind it feels broken on
  // touch, and Escape should close an overlay.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

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
        ref={bellRef}
        onClick={handleBellClick}
        className="p-2 rounded-lg text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-white transition-colors relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c91f41] rounded-full" />
        )}
      </button>

      {isOpen && mounted
        ? createPortal(
            <>
              {/* Portalled to <body> on purpose. The header that renders this bell
                  is `sticky z-20` with `backdrop-blur-md`, and a backdrop-filter
                  creates a stacking context — so a panel nested inside it can
                  never rise above the page, no matter how high its own z-index.
                  That is why the sheet appeared *under* the content on mobile. */}
              <div
                className="fixed inset-0 z-[890] bg-black/40 md:bg-transparent"
                onClick={() => setIsOpen(false)}
              />

              {/* Desktop: anchored dropdown */}
              <div
                role="dialog"
                aria-label="Notifications"
                className="hidden md:flex fixed z-[900] w-96 max-h-[min(28rem,calc(100vh-6rem))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#111111] dark:shadow-black/60"
                style={{
                  right: bellRect ? bellRect.right : 16,
                  top: bellRect ? bellRect.top : 60,
                }}
              >
                <PanelHeader
                  unreadCount={unreadCount}
                  notificationPermission={notificationPermission}
                  onMarkAll={handleMarkAllAsRead}
                  onClose={() => setIsOpen(false)}
                />
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <PanelList
                    loading={loading}
                    notifications={notifications}
                    onOpen={handleNotificationClick}
                    formatTime={formatTime}
                  />
                </div>
              </div>

              {/* Mobile: bottom sheet, capped so it never covers the whole screen */}
              <div
                role="dialog"
                aria-label="Notifications"
                className="md:hidden fixed inset-x-0 bottom-0 z-[900] flex max-h-[80vh] flex-col rounded-t-2xl border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-white/10 dark:bg-[#111111] dark:shadow-black/60"
              >
                <div className="flex justify-center pt-2 pb-1">
                  <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-zinc-600" />
                </div>
                <PanelHeader
                  unreadCount={unreadCount}
                  notificationPermission={notificationPermission}
                  onMarkAll={handleMarkAllAsRead}
                  onClose={() => setIsOpen(false)}
                />
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <PanelList
                    loading={loading}
                    notifications={notifications}
                    onOpen={handleNotificationClick}
                    formatTime={formatTime}
                  />
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}

function PanelHeader({
  unreadCount,
  notificationPermission,
  onMarkAll,
  onClose,
}: {
  unreadCount: number;
  notificationPermission: NotificationPermission;
  onMarkAll: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-none items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/10">
      <div className="min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
        {unreadCount > 0 ? (
          <p className="text-xs text-gray-400 dark:text-zinc-600">{unreadCount} unread</p>
        ) : notificationPermission !== "granted" ? (
          <p className="text-[10px] text-gray-400 dark:text-zinc-600">Alerts are currently disabled</p>
        ) : null}
      </div>
      <div className="flex flex-none items-center gap-1">
        {unreadCount > 0 && (
          <button
            onClick={onMarkAll}
            className="rounded-lg px-2 py-1 text-xs font-medium text-[#c91f41] transition-colors hover:bg-[#c91f41]/10 hover:text-[#a01832]"
          >
            Mark all read
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close notifications"
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PanelList({
  loading,
  notifications,
  onOpen,
  formatTime,
}: {
  loading: boolean;
  notifications: Notification[];
  onOpen: (notification: Notification) => void;
  formatTime: (date: Date) => string;
}) {
  if (loading) {
    return <div className="px-4 py-8 text-center text-gray-400 dark:text-zinc-600">Loading...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-zinc-700" />
        <p className="text-sm text-gray-400 dark:text-zinc-600">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-white/10">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          onClick={() => onOpen(notification)}
          className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
            !notification.isRead ? "bg-[#fef2f4] dark:bg-[#c91f41]/5" : ""
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                notification.isRead ? "bg-gray-300 dark:bg-zinc-700" : "bg-[#c91f41]"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-zinc-400">
                {notification.message}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-zinc-600">
                {formatTime(notification.createdAt)}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
