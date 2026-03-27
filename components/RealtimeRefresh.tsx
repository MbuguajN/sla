"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  intervalMs?: number;
}

export default function RealtimeRefresh({ intervalMs = 30000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}
