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

  const [workspaces, systemUsers] = await Promise.all([
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
