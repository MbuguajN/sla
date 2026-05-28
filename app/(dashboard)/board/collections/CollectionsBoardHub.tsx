"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CollectionBoardSummary = {
  id: number;
  name: string;
  description: string | null;
  _count: {
    cards: number;
    columns: number;
    members: number;
  };
};

type Props = {
  boards: CollectionBoardSummary[];
  latestBoardId: number | null;
};

export default function CollectionsBoardHub({ boards, latestBoardId }: Props) {
  const [query, setQuery] = useState("");

  const filteredBoards = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return boards;

    return boards.filter((board) => {
      return (
        board.name.toLowerCase().includes(term) ||
        (board.description || "").toLowerCase().includes(term)
      );
    });
  }, [boards, query]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500">Your Boards</p>
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 mt-1">
              Search and open any board you can access.
            </p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search boards..."
            className="w-full max-w-xs h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c91f41]/30"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredBoards.length > 0 ? (
            filteredBoards.map((board) => (
              <Link
                key={board.id}
                href={`/board/collections/${board.id}`}
                className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 hover:border-[#c91f41] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{board.name}</p>
                    <p className="text-xs font-medium text-gray-500 dark:text-zinc-500 mt-1 line-clamp-2">
                      {board.description || "No description provided."}
                    </p>
                  </div>
                  {latestBoardId === board.id ? (
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#c91f41]">Latest</span>
                  ) : null}
                </div>
                <p className="mt-3 text-[11px] font-semibold text-gray-500 dark:text-zinc-500">
                  {board._count.columns} columns · {board._count.cards} cards · {board._count.members} members
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 px-4 py-10 text-center text-sm font-semibold text-gray-500 dark:text-zinc-500 md:col-span-2">
              No boards match your search.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
