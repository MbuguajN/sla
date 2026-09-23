"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, AlertTriangle } from "lucide-react";

/**
 * Route-level error boundary for the board.
 *
 * Without this, any exception thrown while rendering the board replaces the
 * whole page with Next's bare "Application error: a client-side exception has
 * occurred", which is unrecoverable without a manual reload and tells nobody
 * what actually broke. This keeps the app navigable and surfaces the real
 * message so a fault can be reported precisely.
 */
export default function BoardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[board] render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#111111]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>

        <h1 className="mt-5 text-xl font-black tracking-tight text-gray-900 dark:text-white">
          The board could not be displayed
        </h1>
        <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-zinc-400">
          Your work is safe — this is a display problem, not a lost change. Try again, and if it
          keeps happening send the detail below to the tech team.
        </p>

        {error?.message ? (
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Detail</p>
            <code className="mt-1 block whitespace-pre-wrap break-words text-[12px] font-semibold text-gray-700 dark:text-zinc-300">
              {error.message}
            </code>
            {error.digest ? (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                Reference {error.digest}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c91f41] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#a01832]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:text-zinc-400 dark:hover:text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
