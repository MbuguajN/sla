import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, canAccessCollectionBoards } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!canAccessCollectionBoards(user)) {
    redirect("/dashboard");
  }

  const featureEnabled = process.env.ENABLE_BOARD_COLLECTIONS === "true";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c91f41]">Boards</p>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Collections</h1>
        <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 max-w-2xl">
          Collaborative boards are being rolled out. This page is now wired into navigation and permission checks.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-6 space-y-4">
        <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Rollout Status</h2>
        <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">
          Feature flag <span className="font-black">ENABLE_BOARD_COLLECTIONS</span> is currently set to:
          <span className="ml-2 font-black text-gray-900 dark:text-white">{featureEnabled ? "true" : "false"}</span>
        </p>

        {!featureEnabled ? (
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
            Collections remains disabled in this environment. Turn on ENABLE_BOARD_COLLECTIONS=true to continue rollout.
          </p>
        ) : (
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3">
            Collections is enabled. Next step is wiring board creation, membership, and task sync actions.
          </p>
        )}

        <Link
          href="/board"
          className="inline-flex h-10 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-black tracking-wide items-center text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white"
        >
          Back to Personal Board
        </Link>
      </div>
    </div>
  );
}
