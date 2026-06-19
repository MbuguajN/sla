"use client";

import { useEffect, useRef } from "react";
import { getUnreadNotifications } from "@/app/actions/notificationActions";

export default function BrowserNotifications() {
  const shownIds = useRef<Set<number>>(new Set());
  const permissionGranted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      permissionGranted.current = true;
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        permissionGranted.current = perm === "granted";
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const poll = async () => {
      if (!permissionGranted.current) {
        if (Notification.permission === "granted") {
          permissionGranted.current = true;
        } else {
          return;
        }
      }

      try {
        const unread = await getUnreadNotifications();
        for (const n of unread) {
          if (shownIds.current.has(n.id)) continue;
          shownIds.current.add(n.id);

          try {
            const notif = new Notification(n.title, {
              body: n.message,
              icon: "/favicon.ico",
              tag: `sla-${n.id}`,
              requireInteraction: false,
            });

            if (n.link) {
              notif.onclick = () => {
                window.open(n.link!, "_blank");
                notif.close();
              };
            }
          } catch {
            // silently fail — some browsers block notifications in background tabs
          }
        }

        // Prune shownIds to only keep recent 200
        if (shownIds.current.size > 200) {
          const arr = Array.from(shownIds.current);
          shownIds.current = new Set(arr.slice(-100));
        }
      } catch {
        // silently fail — notification polling is non-critical
      }
    };

    // Initial poll after 3 seconds
    const initialTimer = setTimeout(poll, 3000);
    // Then every 30 seconds
    const interval = setInterval(poll, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return null;
}
