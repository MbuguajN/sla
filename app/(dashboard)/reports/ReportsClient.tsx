"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckmarkCircle01Icon,
  TaskDone01Icon,
  AlertCircleIcon,
  Clock01Icon,
  Calendar01Icon,
  Upload01Icon,
  Building01Icon,
} from "hugeicons-react";

export type ReportMeta = {
  activeRange: "today" | "7d" | "30d" | "quarter" | "custom";
  startDate: string;
  endDate: string;
  rangeLabel: string;
};

export type ClientHealthSlice = {
  label: "Active & Healthy" | "Monitoring Required" | "Critical Status";
  value: number;
  color: string;
  href: string;
};

export type TrendPoint = {
  label: string;
  value: number;
  startDate: string;
  endDate: string;
  href: string;
};

export type DepartmentPerformanceRow = {
  department: string;
  subtitle: string;
  completed: number;
  met: number;
  missed: number;
  onTimeRate: number;
  avgCompletionHours: number;
  href: string;
};

export type ReportSummary = {
  trackedTasks: number;
  metCount: number;
  missedCount: number;
  complianceRate: number;
  avgCompletionHours: number;
  companyHealthBand: "Healthy" | "Watch" | "Critical";
  complianceDelta: number;
  metDelta: number;
  missedDelta: number;
  avgCompletionDelta: number;
};

interface Props {
  meta: ReportMeta;
  summary: ReportSummary;
  clientHealth: ClientHealthSlice[];
  trend: TrendPoint[];
  departments: DepartmentPerformanceRow[];
}

function buildConicGradient(slices: ClientHealthSlice[]) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return "conic-gradient(#d9deea 0% 100%)";

  let cursor = 0;
  const parts: string[] = [];
  for (const slice of slices) {
    if (!slice.value) continue;
    const pct = (slice.value / total) * 100;
    parts.push(`${slice.color} ${cursor}% ${cursor + pct}%`);
    cursor += pct;
  }

  return `conic-gradient(${parts.join(", ")})`;
}

function buildLineCoordinates(values: number[], width: number, height: number, padding: number) {
  const max = Math.max(100, ...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : innerWidth;

  return values.map((value, index) => {
    const x = padding + index * step;
    const y = padding + (1 - value / max) * innerHeight;
    return { x, y };
  });
}

function pointsToString(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function areaPath(points: { x: number; y: number }[], width: number, height: number, padding: number) {
  if (points.length === 0) return "";
  const top = points.map((point) => `${point.x} ${point.y}`).join(" L ");
  const last = points[points.length - 1];
  const first = points[0];
  return `M ${first.x} ${height - padding} L ${top} L ${last.x} ${height - padding} Z`;
}

function deltaChip(delta: number, invert = false) {
  const positive = invert ? delta <= 0 : delta >= 0;
  const tone = positive
    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-300";
  const sign = delta > 0 ? "+" : "";
  return { tone, label: `${sign}${delta}%` };
}

export default function ReportsClient({ meta, summary, clientHealth, trend, departments }: Props) {
  const router = useRouter();
  const [customStart, setCustomStart] = useState(meta.startDate);
  const [customEnd, setCustomEnd] = useState(meta.endDate);
  const [trendMode, setTrendMode] = useState<"monthly" | "quarterly">("monthly");

  const donutBackground = buildConicGradient(clientHealth);
  const totalClientsForDonut = clientHealth.reduce((sum, s) => sum + s.value, 0);
  const healthySlice = clientHealth.find((s) => s.label === "Active & Healthy");
  const healthyPct = totalClientsForDonut > 0 ? Math.round(((healthySlice?.value || 0) / totalClientsForDonut) * 100) : 0;

  const lineWidth = 760;
  const lineHeight = 260;
  const linePadding = 26;
  const trendValues = trend.map((point) => point.value);
  const linePoints = buildLineCoordinates(trendValues, lineWidth, lineHeight, linePadding);
  const linePolyline = pointsToString(linePoints);
  const lineArea = areaPath(linePoints, lineWidth, lineHeight, linePadding);

  const complianceChip = deltaChip(summary.complianceDelta);
  const metChip = deltaChip(summary.metDelta);
  const missedChip = deltaChip(summary.missedDelta, true);
  const avgChip = deltaChip(summary.avgCompletionDelta);

  const exportRows = useMemo(() => {
    return departments.map((department) => ({
      Department: department.department,
      Completed: department.completed,
      "SLA Met": department.met,
      "SLA Missed": department.missed,
      "On Time Rate": `${department.onTimeRate}%`,
      "Avg Completion": `${department.avgCompletionHours} hrs`,
      Range: meta.rangeLabel,
    }));
  }, [departments, meta.rangeLabel]);

  const setRange = (dateRange: ReportMeta["activeRange"], overrides?: Record<string, string>) => {
    const params = new URLSearchParams(overrides || {});
    params.set("dateRange", dateRange);
    if (dateRange !== "custom") {
      params.delete("startDate");
      params.delete("endDate");
    }
    router.push(`/reports?${params.toString()}`);
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;
    const params = new URLSearchParams({
      dateRange: "custom",
      startDate: customStart,
      endDate: customEnd,
    });
    router.push(`/reports?${params.toString()}`);
  };

  const exportCsv = () => {
    const lines = [
      ["Department", "Completed", "SLA Met", "SLA Missed", "On Time Rate", "Avg Completion", "Range"],
      ...exportRows.map((row) => [row.Department, row.Completed, row["SLA Met"], row["SLA Missed"], row["On Time Rate"], row["Avg Completion"], row.Range]),
    ];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `company-reports-${meta.startDate}-to-${meta.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print();
  };

  const DEPT_COLORS = [
    { bgClass: "bg-[#fde8ed] dark:bg-rose-950/40", iconClass: "text-[#c91f41] dark:text-rose-300" },
    { bgClass: "bg-[#dbeafe] dark:bg-blue-950/40", iconClass: "text-[#1d4ed8] dark:text-blue-300" },
    { bgClass: "bg-[#fef3c7] dark:bg-amber-950/40", iconClass: "text-[#b45309] dark:text-amber-300" },
    { bgClass: "bg-[#dcfce7] dark:bg-emerald-950/40", iconClass: "text-[#15803d] dark:text-emerald-300" },
    { bgClass: "bg-[#ede9fe] dark:bg-violet-950/40", iconClass: "text-[#6d28d9] dark:text-violet-300" },
    { bgClass: "bg-[#fce7f3] dark:bg-pink-950/40", iconClass: "text-[#be185d] dark:text-pink-300" },
    { bgClass: "bg-[#f0fdf4] dark:bg-green-950/40", iconClass: "text-[#166534] dark:text-green-300" },
    { bgClass: "bg-[#fef9c3] dark:bg-yellow-950/40", iconClass: "text-[#a16207] dark:text-yellow-300" },
    { bgClass: "bg-[#fff7ed] dark:bg-orange-950/40", iconClass: "text-[#c2410c] dark:text-orange-300" },
  ];

  return (
    <div className="space-y-8 bg-[#f5f7fc] dark:bg-black -mx-8 -mt-8 px-8 py-8 lg:px-10 min-h-screen">
      <section className="space-y-2 max-w-3xl">
        <h1 className="text-[44px] leading-none font-black tracking-tight text-[#495f85] dark:text-white">Company Reports</h1>
      </section>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 dark:bg-[#111111] border border-white dark:border-white/10 p-1.5 shadow-sm w-fit">
          {([
            { key: "today", label: "Today" },
            { key: "7d", label: "7D" },
            { key: "30d", label: "1M" },
            { key: "quarter", label: "Quarter" },
            { key: "custom", label: "Custom" },
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => setRange(item.key)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                meta.activeRange === item.key
                  ? "bg-[#cf2145] text-white shadow-[0_8px_18px_rgba(207,33,69,0.22)]"
                  : "text-[#6d7893] dark:text-zinc-400 hover:text-[#cf2145] dark:hover:text-rose-300"
              }`}
            >
              {item.label}
              {item.key === "custom" && (
                <Calendar01Icon className="inline-block ml-1.5 h-3 w-3 align-middle" />
              )}
            </button>
          ))}
        </div>
      </section>

      {meta.activeRange === "custom" ? (
        <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-white bg-white/80 dark:bg-[#111111] dark:border-white/10 p-4 shadow-sm">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-11 rounded-2xl border border-[#e4e8f1] dark:border-white/10 bg-white dark:bg-[#0f0f10] px-4 text-sm font-medium text-[#33415d] dark:text-zinc-200 outline-none"
          />
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-11 rounded-2xl border border-[#e4e8f1] dark:border-white/10 bg-white dark:bg-[#0f0f10] px-4 text-sm font-medium text-[#33415d] dark:text-zinc-200 outline-none"
          />
          <button
            onClick={applyCustomRange}
            className="h-11 rounded-2xl bg-[#cf2145] px-5 text-[10px] font-black uppercase tracking-[0.18em] text-white"
          >
            Apply Range
          </button>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <MetricCard
          label="SLA Compliance"
          value={`${summary.complianceRate}%`}
          chip={complianceChip.label}
          chipTone={complianceChip.tone}
          icon={CheckmarkCircle01Icon}
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/35"
          iconClass="text-emerald-600 dark:text-emerald-300"
        />
        <MetricCard
          label="SLA Met"
          value={summary.metCount.toLocaleString()}
          chip={metChip.label}
          chipTone={metChip.tone}
          accent
          icon={TaskDone01Icon}
          iconBgClass="bg-sky-100 dark:bg-sky-900/35"
          iconClass="text-sky-700 dark:text-sky-300"
        />
        <MetricCard
          label="SLA Missed"
          value={summary.missedCount.toLocaleString()}
          chip={missedChip.label}
          chipTone={missedChip.tone}
          icon={AlertCircleIcon}
          iconBgClass="bg-amber-100 dark:bg-amber-900/35"
          iconClass="text-amber-700 dark:text-amber-300"
        />
        <MetricCard
          label="Avg Completion"
          value={`${summary.avgCompletionHours}`}
          unit="hrs"
          chip={avgChip.label}
          chipTone={avgChip.tone}
          icon={Clock01Icon}
          iconBgClass="bg-violet-100 dark:bg-violet-900/35"
          iconClass="text-violet-700 dark:text-violet-300"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4 rounded-[28px] bg-[#eef2fb] dark:bg-[#111111] border border-white dark:border-white/10 p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[30px] leading-none font-black tracking-tight text-[#11203a] dark:text-white">Clients Health</h2>
          </div>

          <div className="mt-8 flex flex-col items-start gap-7">
            <div className="relative mx-auto h-56 w-56 rounded-full" style={{ background: donutBackground }}>
              <div className="absolute inset-[28px] rounded-full bg-white dark:bg-[#0f0f10] flex items-center justify-center text-center shadow-inner">
                <div>
                  <p className="text-[40px] leading-none font-black text-[#152747] dark:text-white">{healthyPct}%</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#909ab0]">Healthy</p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              {clientHealth.map((slice) => (
                <Link key={slice.label} href={slice.href} className="flex items-center justify-between gap-4 text-sm group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                    <span className="font-semibold text-[#49566f] dark:text-zinc-300 group-hover:text-[#cf2145]">{slice.label}</span>
                  </div>
                  <span className="font-black text-[#182845] dark:text-white">{slice.value}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 rounded-[28px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 p-7 shadow-sm overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[30px] leading-none font-black tracking-tight text-[#11203a] dark:text-white">SLA Trend</h2>
              <p className="mt-2 text-xs text-[#8d97aa] dark:text-zinc-500">Performance trajectory over the last 6 months</p>
            </div>
            <div className="inline-flex rounded-full bg-[#f6e9ed] dark:bg-[#2a1a20] p-1 text-[10px] font-black uppercase tracking-[0.12em]">
              <button
                onClick={() => setTrendMode("monthly")}
                className={`rounded-full px-3 py-1 transition-all ${trendMode === "monthly" ? "bg-[#cf2145] text-white" : "text-[#8d6f7c] dark:text-zinc-400"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTrendMode("quarterly")}
                className={`rounded-full px-3 py-1 transition-all ${trendMode === "quarterly" ? "bg-[#cf2145] text-white" : "text-[#8d6f7c] dark:text-zinc-400"}`}
              >
                Quarterly
              </button>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <svg viewBox={`0 0 ${lineWidth} ${lineHeight}`} className="w-full min-w-[680px] h-[280px]">
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                <line
                  key={ratio}
                  x1={linePadding}
                  y1={linePadding + ratio * (lineHeight - linePadding * 2)}
                  x2={lineWidth - linePadding}
                  y2={linePadding + ratio * (lineHeight - linePadding * 2)}
                  stroke="rgba(209,214,226,0.65)"
                  strokeWidth="1"
                />
              ))}
              <path d={lineArea} fill="rgba(207,33,69,0.08)" />
              <polyline fill="none" stroke="#cf2145" strokeWidth="3.5" points={linePolyline} />
              {linePoints.map((point, index) => (
                <Link key={trend[index].label} href={trend[index].href}>
                  <circle cx={point.x} cy={point.y} r="5" fill="#cf2145" className="cursor-pointer" />
                </Link>
              ))}
              {trend.map((point, index) => {
                const x = linePadding + ((lineWidth - linePadding * 2) / Math.max(1, trend.length - 1)) * index;
                return (
                  <text key={point.label} x={x} y={lineHeight - 8} textAnchor="middle" fontSize="10" fill="#9aa3b6">
                    {point.label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-[30px] leading-none font-black tracking-tight text-[#11203a] dark:text-white">Department Performance</h2>
            <p className="mt-2 text-xs text-[#c91f41] dark:text-rose-300">Detailed metric breakdown by functional unit</p>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-2xl border border-[#ead9df] dark:border-[#5e2c39] bg-white dark:bg-[#181114] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#cf2145] dark:text-rose-300"
          >
            <Upload01Icon className="h-3.5 w-3.5 text-[#cf2145] dark:text-rose-300" />
            Export Dataset
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-[#edf0f6] dark:border-white/10 text-left text-[10px] font-black uppercase tracking-[0.18em] text-[#98a2b5] dark:text-zinc-500">
                <th className="px-3 py-4">Department</th>
                <th className="px-3 py-4">Completed</th>
                <th className="px-3 py-4">SLA Met</th>
                <th className="px-3 py-4">SLA Missed</th>
                <th className="px-3 py-4">On-Time Rate</th>
                <th className="px-3 py-4 text-right">Avg Completion</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((row, rowIndex) => (
                <tr key={row.department} className="border-b border-[#f3f5f9] dark:border-white/10 last:border-b-0 group">
                  <td className="px-3 py-5">
                    <Link href={row.href} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                          DEPT_COLORS[rowIndex % DEPT_COLORS.length].bgClass
                        )}
                      >
                        <Building01Icon
                          className={cn("h-4 w-4", DEPT_COLORS[rowIndex % DEPT_COLORS.length].iconClass)}
                        />
                      </div>
                      <p className="text-sm font-black text-[#182845] dark:text-white">{row.department}</p>
                    </Link>
                  </td>
                  <td className="px-3 py-5 text-sm font-bold text-[#22314b] dark:text-zinc-200">{row.completed}</td>
                  <td className="px-3 py-5 text-sm font-bold text-[#22314b] dark:text-zinc-200">{row.met}</td>
                  <td className="px-3 py-5 text-sm font-bold text-[#cf2145] dark:text-rose-300">{row.missed}</td>
                  <td className="px-3 py-5 w-[220px]">
                    <div className="space-y-1.5">
                      <div className="h-1.5 rounded-full bg-[#f0f2f7] dark:bg-zinc-800">
                        <div className="h-full rounded-full bg-[#cf2145]" style={{ width: `${Math.min(100, Math.max(0, row.onTimeRate))}%` }} />
                      </div>
                      <p className="text-[11px] font-black text-[#22314b] dark:text-zinc-300">{row.onTimeRate}%</p>
                    </div>
                  </td>
                  <td className="px-3 py-5 text-right text-sm font-bold text-[#22314b] dark:text-zinc-200">{row.avgCompletionHours} hrs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  chip,
  chipTone,
  accent = false,
  icon: Icon,
  iconBgClass,
  iconClass,
}: {
  label: string;
  value: string;
  unit?: string;
  chip: string;
  chipTone: string;
  accent?: boolean;
  icon: React.ElementType;
  iconBgClass: string;
  iconClass: string;
}) {
  return (
    <div className={`rounded-[26px] bg-white dark:bg-[#111111] border border-white dark:border-white/10 px-6 py-5 shadow-sm ${accent ? "ring-1 ring-inset ring-[#cf2145]/15" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconBgClass)}>
          <Icon className={cn("h-5 w-5", iconClass)} />
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${chipTone}`}>
          {chip}
        </span>
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#98a2b5]">{label}</p>
      <div className="mt-2 flex items-end gap-1.5">
        <p className="text-[42px] leading-none font-black text-[#11203a] dark:text-white">{value}</p>
        {unit ? <span className="pb-1 text-sm font-bold text-[#7e879b] dark:text-zinc-400">{unit}</span> : null}
      </div>
    </div>
  );
}
