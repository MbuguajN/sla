"use client";

import { useCallback, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

interface Props {
  timeoutMs?: number;
}

export default function InactivityLogout({ timeoutMs = DEFAULT_TIMEOUT_MS }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/login" });
    }, timeoutMs);
  }, [clearTimer, timeoutMs]);

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    };

    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);

    resetTimer();

    return () => {
      clearTimer();
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [clearTimer, resetTimer]);

  return null;
}
