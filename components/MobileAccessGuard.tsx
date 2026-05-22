"use client";

import { useEffect, useState } from "react";

interface Props {
  children: React.ReactNode;
}

const DESKTOP_MIN_WIDTH = 1024;
const MOBILE_USER_AGENT_PATTERN = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export default function MobileAccessGuard({ children }: Props) {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const evaluateAccess = () => {
      if (typeof window === "undefined") {
        return;
      }

      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isPhoneOrTabletUserAgent = MOBILE_USER_AGENT_PATTERN.test(userAgent);
      const isSmallViewport = window.innerWidth < DESKTOP_MIN_WIDTH;

      setIsBlocked(isPhoneOrTabletUserAgent || isSmallViewport);
    };

    evaluateAccess();
    window.addEventListener("resize", evaluateAccess);
    window.addEventListener("orientationchange", evaluateAccess);

    return () => {
      window.removeEventListener("resize", evaluateAccess);
      window.removeEventListener("orientationchange", evaluateAccess);
    };
  }, []);

  if (!isBlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#edeef3] dark:bg-black px-6">
      <div className="w-full max-w-md rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-7 py-8 text-center shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c91f41]">Desktop Required</p>
        <h1 className="mt-3 text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">
          Please access using your laptop
        </h1>
        <p className="mt-3 text-sm text-[#75666f] dark:text-slate-400">
          Mobile and phone view is not supported for this system.
        </p>
      </div>
    </div>
  );
}
