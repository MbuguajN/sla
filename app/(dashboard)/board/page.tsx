import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import BoardWorkbenchClient from "./BoardWorkbenchClient";
import { getWorkspaces } from "@/app/actions/boardActions";

export const dynamic = "force-dynamic";

export default async function BoardPage({ searchParams }: { searchParams?: { active?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBoardId = searchParams?.active || undefined;

  const [workspacesResult, systemUsers] = await Promise.all([
    getWorkspaces(),
    db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    })
  ]);

  // getWorkspaces returns an ActionResult, not a bare array. Passing the
  // envelope straight through is what made the board crash with
  // "workspaces.flatMap is not a function".
  if (!workspacesResult.ok) {
    console.error("[board] failed to load workspaces:", workspacesResult.error);
  }
  const workspaces = workspacesResult.ok ? workspacesResult.data : [];

  return (
    <BoardWorkbenchClient
      currentUser={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: (user as any).role,
      }}
      systemUsers={systemUsers}
      initialWorkspaces={JSON.parse(JSON.stringify(workspaces))}
      initialActiveBoardId={activeBoardId}
    />
  );
}
