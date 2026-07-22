"use client";

import { useState } from "react";
import { Calendar01Icon, Cancel01Icon, TimeSetting01Icon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

type Preset = "all" | "today" | "7d" | "1m" | "quarter" | "custom";

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  onReset?: () => void;
  focusColor?: string;
}

function getPresetBounds(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  if (preset === "today") return { from: to, to };
  if (preset === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { from: d.toISOString().split("T")[0], to };
  }
  if (preset === "1m") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return { from: d.toISOString().split("T")[0], to };
  }
  if (preset === "quarter") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return { from: d.toISOString().split("T")[0], to };
  }
  return { from: "", to: "" };
}

const presets: { key: Preset; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "7d", label: "7D" },
  { key: "1m", label: "1M" },
  { key: "quarter", label: "Quarter" },
  { key: "custom", label: "Custom" },
];

export default function DateRangeFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onReset,
  focusColor = "pink-500",
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<Preset>("all");

  const handlePreset = (p: Preset) => {
    setActivePreset(p);
    if (p === "custom") {
      onFromDateChange("");
      onToDateChange("");
      return;
    }
    if (p === "all") {
      onFromDateChange("");
      onToDateChange("");
      return;
    }
    const { from, to } = getPresetBounds(p);
    onFromDateChange(from);
    onToDateChange(to);
  };

  const handleFrom = (v: string) => {
    setActivePreset("custom");
    onFromDateChange(v);
  };

  const handleTo = (v: string) => {
    setActivePreset("custom");
    onToDateChange(v);
  };

  const hasFilter = fromDate || toDate;

  const ringClass = cn(
    "focus:outline-none focus:ring-2",
    focusColor === "pink-500" && "focus:ring-pink-500",
    focusColor === "amber-500" && "focus:ring-amber-500",
    focusColor === "emerald-500" && "focus:ring-emerald-500",
    focusColor === "indigo-500" && "focus:ring-indigo-500",
    focusColor === "rose-500" && "focus:ring-rose-500",
    focusColor === "#c91f41" && "focus:ring-[#c91f41]"
  );

  return (
    <div className="space-y-2">
      {/* Preset buttons — horizontal scroll on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Calendar01Icon className="h-4 w-4 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all flex-shrink-0",
              activePreset === p.key
                ? "bg-[#c91f41] text-white shadow-sm"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10"
            )}
          >
            {p.label}
          </button>
        ))}
        {hasFilter && onReset && (
          <button
            onClick={() => {
              setActivePreset("all");
              onReset();
            }}
            className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center gap-1 flex-shrink-0"
          >
            <Cancel01Icon className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Custom date inputs — only when Custom is active */}
      {activePreset === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider pointer-events-none">
              From
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFrom(e.target.value)}
              className={cn(
                "w-full pl-14 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white [color-scheme:light dark:dark]",
                ringClass
              )}
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider pointer-events-none">
              To
            </span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleTo(e.target.value)}
              className={cn(
                "w-full pl-12 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white [color-scheme:light dark:dark]",
                ringClass
              )}
            />
          </div>
        </div>
      )}

      {/* Show active range summary when not custom */}
      {activePreset !== "custom" && activePreset !== "all" && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-500">
          <TimeSetting01Icon className="h-3.5 w-3.5" />
          <span>
            Showing {activePreset === "today" ? "today" : activePreset === "7d" ? "last 7 days" : activePreset === "1m" ? "last month" : "last quarter"}
          </span>
        </div>
      )}
    </div>
  );
}
