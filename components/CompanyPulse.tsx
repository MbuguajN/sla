"use client";

import { useState, useEffect, useCallback } from "react";
import { getCompanyPulse, postPulseComment, type PulseItem } from "@/app/actions/pulseActions";
import { cn } from "@/lib/utils";
import {
  Message01Icon,
  CheckmarkCircle01Icon,
  UserMultipleIcon,
  Settings02Icon,
  Loading03Icon,
} from "@hugeicons/react";

type FilterTab = "all" | "task" | "team" | "system";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "task", label: "TASKS" },
  { key: "team", label: "TEAM" },
  { key: "system", label: "SYSTEM" },
];

function getDotColor(item: PulseItem): string {
  switch (item.type) {
    case "activity": return "bg-[#c91f41]";
    case "leave": return "bg-emerald-500";
    case "board_activity": return "bg-amber-500";
    case "it_ticket": return "bg-purple-500";
    case "comment": return "bg-gray-400";
    default: return "bg-gray-400";
  }
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-rose-100 text-rose-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-amber-100 text-amber-600",
    "bg-purple-100 text-purple-600",
    "bg-teal-100 text-teal-600",
    "bg-pink-100 text-pink-600",
    "bg-indigo-100 text-indigo-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

export default function CompanyPulse({
  initialFeed,
  currentUserId,
}: {
  initialFeed: PulseItem[];
  currentUserId: number;
}) {
  const [feed, setFeed] = useState<PulseItem[]>(initialFeed);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchFeed = useCallback(async () => {
    try {
      const items = await getCompanyPulse();
      setFeed(items);
      setLastRefresh(Date.now());
    } catch {}
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchFeed, 15000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const filtered = activeTab === "all" ? feed : feed.filter((item) => item.category === activeTab);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await postPulseComment(comment.trim());
      setComment("");
      await fetchFeed();
    } catch {}
    setSubmitting(false);
  }

  return (
    <div
      className="bg-white dark:bg-[#111111] shadow-sm dark:shadow-none rounded-3xl border border-gray-100 dark:border-white/10 overflow-hidden relative flex flex-col"
      style={{ height: "480px" }}
    >
      <div className="flex items-center justify-between mb-4 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fff1f2] flex items-center justify-center">
            <Message01Icon className="h-5 w-5 text-[#c91f41]" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Company Pulse</h2>
            <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">Community Feed</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 px-5 mb-3">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200",
              activeTab === tab.key
                ? "bg-[#c91f41] text-white shadow-sm"
                : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-4 px-5 overflow-y-auto pr-3 custom-scrollbar flex-1">
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const initials = item.userName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            return (
              <div key={item.id} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:z-10 after:absolute after:left-[2.5px] after:top-3 after:h-[calc(100%+0.5rem)] after:w-px after:bg-gray-100 last:after:hidden" style={{ "--tw-before-bg": getDotColor(item) } as any}>
                <div
                  className={cn(
                    "absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full z-10",
                    getDotColor(item)
                  )}
                />
                <div className="flex items-start gap-2.5">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black", getAvatarColor(item.userName))}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white font-bold leading-snug">{item.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-tighter">{item.userName}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600">{formatTimeAgo(item.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
              <Message01Icon className="h-6 w-6 text-gray-300 dark:text-zinc-700" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-zinc-400">No updates yet</p>
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Activity will appear as it happens.</p>
          </div>
        )}
      </div>

      {/* Comment Box */}
      <div className="border-t border-gray-100 dark:border-white/10 px-5 py-3 mt-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black", getAvatarColor("You"))}>
            {initials("You")}
          </div>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Post an update..."
            className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full px-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-[#c91f41]/30 transition-colors"
          />
          <button
            type="submit"
            disabled={!comment.trim() || submitting}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200",
              comment.trim() && !submitting
                ? "bg-[#c91f41] text-white hover:bg-[#a81a36] shadow-sm"
                : "bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-zinc-700 cursor-not-allowed"
            )}
          >
            {submitting ? (
              <Loading03Icon className="h-4 w-4 animate-spin" />
            ) : (
              <Message01Icon className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
