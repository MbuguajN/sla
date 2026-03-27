"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react";

type DeadlineTask = {
  id: number;
  title: string;
  slaStartedAt: string | null;
  slaHours: number | null;
};

interface Props {
  tasks: DeadlineTask[];
}

export default function DeadlineCalendarClient({ tasks }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [tooltip, setTooltip] = useState<{ day: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString("default", { month: "long" });

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let firstDay = new Date(viewYear, viewMonth, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1; // Monday = 0

  const blanks = Array.from({ length: firstDay }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allDays = [...blanks, ...days];

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  // Build a map: day → tasks with deadline on that day in the viewed month
  const deadlineMap = new Map<number, DeadlineTask[]>();
  tasks.forEach((task) => {
    if (!task.slaStartedAt || !task.slaHours) return;
    const deadline = new Date(new Date(task.slaStartedAt).getTime() + task.slaHours * 3600000);
    if (deadline.getMonth() === viewMonth && deadline.getFullYear() === viewYear) {
      const d = deadline.getDate();
      if (!deadlineMap.has(d)) deadlineMap.set(d, []);
      deadlineMap.get(d)!.push(task);
    }
  });

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setTooltip(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setTooltip(null);
  };

  const handleMouseEnter = (day: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!deadlineMap.has(day)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setTooltip({
      day,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    });
  };

  const tooltipTasks = tooltip ? (deadlineMap.get(tooltip.day) ?? []) : [];
  const MAX_SHOWN = 4;

  return (
    <div ref={containerRef} className="relative bg-white rounded-3xl border border-gray-100 p-5 shadow-sm h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-black text-gray-900 tracking-tight">Deadlines</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            {monthName} {viewYear}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#c91f41] hover:bg-[#fff1f2] transition-all"
          >
            <ArrowLeft01Icon className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#c91f41] hover:bg-[#fff1f2] transition-all"
          >
            <ArrowRight01Icon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-black text-gray-300 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day, idx) => (
          <div key={idx} className="aspect-square flex flex-col items-center justify-center relative">
            {day ? (
              <button
                onMouseEnter={(e) => handleMouseEnter(day, e)}
                onMouseLeave={() => setTooltip(null)}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all relative z-10",
                  isToday(day)
                    ? "bg-[#c91f41] text-white shadow-md shadow-[#c91f41]/20"
                    : deadlineMap.has(day)
                    ? "text-gray-700 hover:bg-rose-50 hover:text-[#c91f41]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {day}
                {deadlineMap.has(day) && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 w-1 h-1 rounded-full",
                      isToday(day) ? "bg-white" : "bg-[#c91f41]"
                    )}
                  />
                )}
              </button>
            ) : (
              <div className="w-7 h-7" />
            )}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && tooltipTasks.length > 0 && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-[#1a2740] text-white rounded-xl shadow-2xl p-3 min-w-[180px] max-w-[240px]">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-400 mb-2">
              SLA Deadlines
            </p>
            <ul className="space-y-1.5">
              {tooltipTasks.slice(0, MAX_SHOWN).map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#c91f41] flex-shrink-0" />
                  <span className="text-[12px] font-bold leading-tight">{t.title}</span>
                </li>
              ))}
              {tooltipTasks.length > MAX_SHOWN && (
                <li className="text-[11px] text-gray-400 font-semibold pl-3.5">
                  …and {tooltipTasks.length - MAX_SHOWN} more
                </li>
              )}
            </ul>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-3 h-3 bg-[#1a2740] rotate-45 rounded-sm" />
          </div>
        </div>
      )}
    </div>
  );
}
