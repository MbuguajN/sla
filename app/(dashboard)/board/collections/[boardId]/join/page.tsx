import { redirect } from "next/navigation";
import { acceptCollectionBoardInvite } from "@/app/actions/collectionBoardActions";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ boardId: string }>;
};

export default async function CollectionBoardJoinPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { boardId } = await params;
  const parsedBoardId = Number(boardId);
  if (!Number.isFinite(parsedBoardId)) {
    redirect("/board/collections");
  }

  const [board, membership] = await Promise.all([
    db.collectionBoard.findUnique({
      where: { id: parsedBoardId },
      select: { id: true, name: true, owner: { select: { name: true } } },
    }),
    db.collectionBoardMember.findUnique({
      where: { boardId_userId: { boardId: parsedBoardId, userId: user.id } },
      select: { id: true, acceptedAt: true },
    }),
  ]);

  if (!board) redirect("/board/collections");
  if (!membership) redirect("/dashboard");
  if (membership.acceptedAt) redirect(`/board/collections/${parsedBoardId}`);

  const acceptAction = async () => {
    "use server";
    await acceptCollectionBoardInvite(parsedBoardId);
    redirect(`/board/collections/${parsedBoardId}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-6 space-y-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c91f41]">Collection Invite</p>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Join {board.name}</h1>
        <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">
          You were invited to this board by {board.owner.name}. Accept the invitation to start collaborating.
        </p>

        <form action={acceptAction}>
          <button
            type="submit"
            className="inline-flex h-11 px-5 rounded-xl bg-[#c91f41] text-white text-sm font-black tracking-wide items-center"
          >
            Accept Invitation
          </button>
        </form>
      </div>
    </div>
  );
}
