"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, Search } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import {
  Card,
  CardBody,
  Badge,
  Button,
  Input,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/daisy-components";

type SuggestionItem = {
  id: number;
  title: string;
  content: string;
  category: string;
  isAnonymous: boolean;
  userName: string;
  status: string;
  hrNote: string | null;
  createdAt: string;
};

interface Props {
  initialSuggestions: SuggestionItem[];
}

export default function HRSuggestionsClient({ initialSuggestions }: Props) {
  const [suggestions] = useState(initialSuggestions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = suggestions.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;

    if (!matchSearch || !matchStatus) return false;

    if (filterFromDate || filterToDate) {
      const itemDate = new Date(s.createdAt).getTime();
      const fromTime = filterFromDate ? new Date(filterFromDate).getTime() : 0;
      const toTime = filterToDate
        ? new Date(new Date(filterToDate).getTime() + 86400000).getTime()
        : Infinity;

      if (itemDate < fromTime || itemDate > toTime) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedItems = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const statusColors: Record<string, string> = {
    OPEN: "info",
    IN_REVIEW: "primary",
    ACTIONED: "success",
    CLOSED: "secondary",
  };

  const categoryColors: Record<string, string> = {
    COMPLAINT: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    SUGGESTION: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    FEEDBACK: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
    REQUEST: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  };

  const statuses = ["ALL", "OPEN", "IN_REVIEW", "ACTIONED", "CLOSED"];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-[#fef2f4] dark:bg-[#c91f41]/10 rounded-xl">
              <MessageSquare className="h-4 w-4 text-[#c91f41]" />
            </div>
            <span className="text-[11px] font-black text-[#c91f41] uppercase tracking-[0.2em]">Culture Lab</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Suggestions Box</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">Track suggestions, route actions, and close feedback loops.</p>
        </div>
        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Open</p>
            <p className="text-4xl font-black text-slate-800 dark:text-white mt-2">{suggestions.filter((s) => s.status === "OPEN").length}</p>
          </div>
          <div className="rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">In Review</p>
            <p className="text-4xl font-black text-slate-800 dark:text-white mt-2">{suggestions.filter((s) => s.status === "IN_REVIEW").length}</p>
          </div>
          <div className="rounded-3xl bg-white dark:bg-black/40 border border-gray-100 dark:border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Actioned</p>
            <p className="text-4xl font-black text-slate-800 dark:text-white mt-2">{suggestions.filter((s) => s.status === "ACTIONED").length}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black/40 overflow-hidden flex flex-col">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
              {filtered.length} suggestion{filtered.length !== 1 ? "s" : ""} (showing {paginatedItems.length})
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search title or content"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-10 rounded-xl border-gray-200 bg-white dark:bg-black dark:border-white/10 dark:text-zinc-100"
              />
            </div>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => {
                setFilterFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c91f41]"
            />
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => {
                setFilterToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c91f41]"
            />
          </div>

          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl bg-gray-50 dark:bg-white/5 p-1.5 border border-gray-100 dark:border-white/10">
            {statuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-xl h-8 px-3 text-[11px] font-black uppercase tracking-[0.12em] border transition-colors",
                  statusFilter === s
                    ? "bg-[#c91f41] border-[#c91f41] text-white hover:bg-[#b31c3a]"
                    : "bg-white dark:bg-black border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:border-[#f0c8d2] hover:text-[#c91f41]"
                )}
              >
                {s === "ALL" ? "All" : s.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
        <div className="rounded-none border-0 shadow-none bg-transparent">
          <div className="p-0">
            {paginatedItems.length > 0 ? (
              <Table>
                <TableHead>
                  <TableHeader>Title</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Author</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableHead>
                  <TableBody>
                    {paginatedItems.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{s.title}</p>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          <MarkdownRenderer content={s.content} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
                        </div>
                        {s.hrNote && <p className="text-[11px] text-gray-400 mt-2">HR Note: {s.hrNote}</p>}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[s.category]}`}>{s.category}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700 dark:text-zinc-200">{s.isAnonymous ? "Anonymous" : s.userName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-zinc-300">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[s.status] || "secondary"}>{s.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        {s.status !== "CLOSED" && (
                          <Link
                            href={`/hr/suggestions/${s.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-[#f0c8d2] dark:border-[#c91f41]/30 text-[#c91f41] font-bold text-sm hover:bg-[#fef2f4] dark:hover:bg-[#c91f41]/10 px-3 py-1.5 transition-colors"
                          >
                            Review
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-14">
                <MessageSquare className="h-12 w-12 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-zinc-400">No suggestions found</p>
              </div>
            )}
          </div>
        </div>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              Page {safePage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
