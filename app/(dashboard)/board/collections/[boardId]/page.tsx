import Link from "next/link";
import { redirect } from "next/navigation";
import { canAccessCollectionBoards, getCurrentUser } from "@/lib/permissions";
import { createCollectionBoardCard, getCollectionBoard } from "@/app/actions/collectionBoardActions";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ boardId: string }>;
};

export default async function CollectionBoardPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!canAccessCollectionBoards(user)) {
    redirect("/dashboard");
  }

  const { boardId } = await params;
  const parsedBoardId = Number(boardId);
  if (!Number.isFinite(parsedBoardId)) {
    redirect("/board/collections");
  }

  const data = await getCollectionBoard(parsedBoardId);
  const board = data.board;

  const addCardAction = async (formData: FormData) => {
    "use server";
    await createCollectionBoardCard({
      boardId: parsedBoardId,
      columnId: Number(formData.get("columnId")),
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      projectId: Number(formData.get("projectId")),
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RealtimeRefresh intervalMs={5000} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c91f41]">Boards</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{board.name}</h1>
          <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 max-w-3xl">
            {board.description || "A shared collection board for your team."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/board"
            className="inline-flex h-10 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-black tracking-wide items-center text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white"
          >
            Personal Board
          </Link>
          <Link
            href="/board/collections"
            className="inline-flex h-10 px-4 rounded-xl bg-[#c91f41] text-white text-sm font-black tracking-wide items-center"
          >
            Open Latest
          </Link>
          {data.canEdit ? (
            <Link
              href={`/board/collections/${board.id}/settings`}
              className="inline-flex h-10 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-black tracking-wide items-center text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white"
            >
              Settings
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <aside className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-4 space-y-4 h-fit">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500">Accessible Boards</p>
            <div className="mt-3 space-y-2">
              {data.boards.map((item) => (
                <Link
                  key={item.id}
                  href={`/board/collections/${item.id}`}
                  className={`block rounded-xl border px-3 py-3 transition-colors ${
                    item.id === board.id
                      ? "border-[#c91f41] bg-[#fff1f2] dark:bg-[#c91f41]/10"
                      : "border-gray-100 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-500 truncate">
                    {item._count.columns} columns · {item._count.cards} cards · {item._count.members} members
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500">Members</p>
            <div className="mt-3 space-y-2">
              {board.members.map((member) => (
                <div key={member.id} className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-3 py-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{member.user.name}</p>
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                    {member.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {data.canEdit ? (
            <form action={addCardAction} className="rounded-xl border border-gray-100 dark:border-white/10 p-3 space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500 mb-2">
                  Card title
                </label>
                <input
                  name="title"
                  placeholder="Add a card"
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-3 text-sm font-semibold text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500 mb-2">
                  Project
                </label>
                <select
                  name="projectId"
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-3 text-sm font-semibold text-gray-900 dark:text-white"
                  defaultValue={data.projects[0]?.id || ""}
                >
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500 mb-2">
                  Column
                </label>
                <select
                  name="columnId"
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-3 text-sm font-semibold text-gray-900 dark:text-white"
                  defaultValue={board.columns[0]?.id || ""}
                >
                  {board.columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-[#c91f41] text-white text-sm font-black tracking-wide"
              >
                Add Card
              </button>
            </form>
          ) : null}
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500">
              Current Board
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-zinc-400">
              Board owner: <span className="font-black text-gray-900 dark:text-white">{board.owner.name}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {board.columns.map((column) => (
              <div key={column.id} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{column.title}</p>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-[0.12em]">
                      {column.mappedTaskStatus.replaceAll("_", " ")}
                    </p>
                  </div>
                  <span className="text-[11px] font-black text-gray-400 dark:text-zinc-500">
                    {column.cards.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {column.cards.map((card) => (
                    <article key={card.id} className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-[#fff1f2] border border-[#f5c1cb] flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-black text-[#c91f41]">
                              {(card.task.createdBy?.name || card.assignedBy?.name || "U").slice(0, 1).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{card.title}</h3>
                            <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 mt-1 truncate">
                              {card.task.project.title}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                          {card.task.status}
                        </span>
                      </div>
                      {card.description ? (
                        <p className="mt-2 text-xs font-medium text-gray-600 dark:text-zinc-400">{card.description}</p>
                      ) : null}
                      <p className="mt-2 text-[11px] font-semibold text-gray-500 dark:text-zinc-500">
                        Assigned by {card.assignedBy?.name || "Unknown"}
                      </p>
                    </article>
                  ))}

                  {column.cards.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 px-4 py-6 text-center text-xs font-semibold text-gray-500 dark:text-zinc-500">
                      No cards yet.
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
