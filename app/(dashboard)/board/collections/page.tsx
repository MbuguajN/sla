import Link from "next/link";
import { redirect } from "next/navigation";
import { canAccessCollectionBoards, getCurrentUser } from "@/lib/permissions";
import { createCollectionBoard, getCollectionBoards } from "@/app/actions/collectionBoardActions";
import CollectionsBoardHub from "./CollectionsBoardHub";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!canAccessCollectionBoards(user)) {
    redirect("/dashboard");
  }

  const boards = await getCollectionBoards();
  const latestBoard = boards[0] || null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <RealtimeRefresh intervalMs={5000} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c91f41]">Boards</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Collections</h1>
          <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 max-w-2xl">
            Create and switch between shared boards. The most recently accessed board is shown first in the list below.
          </p>
        </div>

        {latestBoard ? (
          <Link
            href={`/board/collections/${latestBoard.id}`}
            className="inline-flex h-11 px-5 rounded-xl bg-[#c91f41] text-white text-sm font-black tracking-wide items-center"
          >
            Open Latest Board
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-5 space-y-4 h-fit">
          <div>
            <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Create Board</h2>
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 mt-1">
              Start a new collection board for a project, team, or initiative.
            </p>
          </div>

          <form action={createCollectionBoard} className="space-y-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-400 mb-2">
                Board name
              </label>
              <input
                name="name"
                placeholder="Creative Sprint Board"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c91f41]/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-400 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows={4}
                placeholder="What should this collection board be used for?"
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c91f41]/30"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-11 px-5 rounded-xl bg-[#c91f41] text-white text-sm font-black tracking-wide items-center justify-center"
            >
              Create Collection Board
            </button>
          </form>
        </section>

        <CollectionsBoardHub boards={boards} latestBoardId={latestBoard?.id ?? null} />
      </div>
    </div>
  );
}
