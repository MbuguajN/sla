import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCollectionBoard, inviteCollectionBoardMember, createCollectionBoardColumn, removeCollectionBoardMember, updateCollectionBoardMemberRole } from "@/app/actions/collectionBoardActions";
import { canAccessCollectionBoards, getCurrentUser } from "@/lib/permissions";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ boardId: string }>;
};

export default async function CollectionBoardSettingsPage({ params }: PageProps) {
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
  if (!data.canEdit) {
    redirect(`/board/collections/${parsedBoardId}`);
  }

  const inviteAction = async (formData: FormData) => {
    "use server";
    await inviteCollectionBoardMember({
      boardId: parsedBoardId,
      email: String(formData.get("email") || ""),
    });
    revalidatePath(`/board/collections/${parsedBoardId}/settings`);
  };

  const columnAction = async (formData: FormData) => {
    "use server";
    await createCollectionBoardColumn({
      boardId: parsedBoardId,
      title: String(formData.get("title") || ""),
      mappedTaskStatus: String(formData.get("mappedTaskStatus") || "ASSIGNED") as
        | "ASSIGNED"
        | "CONFIRMED"
        | "IN_PROGRESS"
        | "PAUSED"
        | "SUBMITTED"
        | "REVISION"
        | "DONE",
    });
    revalidatePath(`/board/collections/${parsedBoardId}/settings`);
  };

  const roleAction = async (formData: FormData) => {
    "use server";
    await updateCollectionBoardMemberRole({
      boardId: parsedBoardId,
      userId: Number(formData.get("userId")),
      role: String(formData.get("role")) as "OWNER" | "MEMBER",
    });
    revalidatePath(`/board/collections/${parsedBoardId}/settings`);
  };

  const removeAction = async (formData: FormData) => {
    "use server";
    await removeCollectionBoardMember({
      boardId: parsedBoardId,
      userId: Number(formData.get("userId")),
    });
    revalidatePath(`/board/collections/${parsedBoardId}/settings`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <RealtimeRefresh intervalMs={5000} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c91f41]">Collections</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{data.board.name} Settings</h1>
          <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 max-w-2xl">
            Invite members, manage columns, and maintain the board structure.
          </p>
          <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500">
            Invitees can accept from <span className="font-black text-gray-900 dark:text-white">/board/collections/{parsedBoardId}/join</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-5 space-y-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Invite Member</h2>
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 mt-1">
              Invite an active user by email. They can accept the invite and join the board.
            </p>
          </div>

          <form action={inviteAction} className="space-y-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-400 mb-2">
                Email
              </label>
              <input
                name="email"
                placeholder="person@5dm.africa"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 text-sm font-semibold text-gray-900 dark:text-white"
              />
            </div>
            <button type="submit" className="h-11 px-5 rounded-xl bg-[#c91f41] text-white text-sm font-black tracking-wide">
              Invite Member
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-5 space-y-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Add Column</h2>
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 mt-1">
              Create custom workflow columns for this board.
            </p>
          </div>

          <form action={columnAction} className="space-y-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-400 mb-2">
                Title
              </label>
              <input
                name="title"
                placeholder="Review"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 text-sm font-semibold text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-400 mb-2">
                Status mapping
              </label>
              <select
                name="mappedTaskStatus"
                defaultValue="ASSIGNED"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 text-sm font-semibold text-gray-900 dark:text-white"
              >
                <option value="ASSIGNED">Assigned</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PAUSED">Paused</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="REVISION">Revision</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <button type="submit" className="h-11 px-5 rounded-xl bg-[#c91f41] text-white text-sm font-black tracking-wide">
              Add Column
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-5 space-y-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Members</h2>
          <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 mt-1">
            Update board roles or remove members from the board.
          </p>
        </div>

        <div className="space-y-3">
          {data.board.members.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{member.user.name}</p>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-500">{member.user.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form action={roleAction} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={member.userId} />
                  <select
                    name="role"
                    defaultValue={member.role}
                    className="h-9 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-3 text-xs font-black uppercase tracking-wide text-gray-900 dark:text-white"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="OWNER">Owner</option>
                  </select>
                  <button type="submit" className="h-9 px-4 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wide">
                    Save
                  </button>
                </form>

                <form action={removeAction}>
                  <input type="hidden" name="userId" value={member.userId} />
                  <button type="submit" className="h-9 px-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-black uppercase tracking-wide">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-3">
        <a href={`/board/collections/${parsedBoardId}`} className="inline-flex h-11 px-5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-black tracking-wide items-center text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white">
          Back to Board
        </a>
      </div>
    </div>
  );
}
