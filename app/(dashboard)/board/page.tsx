import { redirect } from "next/navigation";
import { canViewOtherBoards, getCurrentUser } from "@/lib/permissions";
import { getPersonalBoardData } from "@/app/actions/boardActions";
import BoardClient from "./board-client";

type SearchParams = {
  userId?: string;
};

type BoardPageData = {
  columns: Array<{
    id: number;
    title: string;
    code: string;
    kind: "TODO" | "IN_PROGRESS" | "DONE" | "CUSTOM";
    mappedTaskStatus: string;
    position: number;
    cards: Array<{
      id: number;
      title: string;
      description: string | null;
      position: number;
      enteredColumnAt?: string | Date;
      task: { id: number; status: string; priority: string; source: string; createdAt?: string | Date };
      project: { id: number; title: string };
      client: { id: number; name: string };
      owner: { id: number; name: string; role: string };
      assignedBy: { id: number; name: string; role: string } | null;
    }>;
  }>;
  users: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    departmentId: number | null;
    department: { id: number; name: string; slug: string } | null;
  }>;
  projects: Array<{
    id: number;
    title: string;
    clientId: number;
    client: { id: number; name: string };
  }>;
  canSwitchBoards: boolean;
  canEditBoard: boolean;
  selectedUser: {
    id: number;
    name: string;
    email: string;
    role: string;
    departmentId: number | null;
    department: { id: number; name: string; slug: string } | null;
  };
  me: { id: number; name: string; role: string };
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const requestedUserId = params.userId ? Number(params.userId) : user.id;
  const selectedUserId = Number.isFinite(requestedUserId) ? requestedUserId : user.id;
  const allowedToSwitch = canViewOtherBoards(user);
  const targetUserId = allowedToSwitch ? selectedUserId : user.id;

  const data = (await getPersonalBoardData(targetUserId)) as BoardPageData;

  const boardUsers = data.users.filter((candidate) => allowedToSwitch || candidate.id === user.id);

  return (
    <BoardClient
      key={data.selectedUser.id}
      boardUsers={boardUsers}
      initialColumns={data.columns.map((column) => ({
        id: column.id,
        title: column.title,
        code: column.code,
        kind: column.kind,
        mappedTaskStatus: column.mappedTaskStatus,
        position: column.position,
        cards: column.cards.map((card) => ({
          id: card.id,
          title: card.title,
          description: card.description,
          position: card.position,
          enteredColumnAt: "enteredColumnAt" in card && card.enteredColumnAt ? String(card.enteredColumnAt) : undefined,
          task: {
            id: card.task.id,
            status: card.task.status,
            priority: card.task.priority,
            source: card.task.source,
            createdAt: "createdAt" in card.task && card.task.createdAt ? String(card.task.createdAt) : undefined,
          },
          project: card.project,
          client: card.client,
          owner: card.owner,
          assignedBy: card.assignedBy,
        })),
      }))}
      users={data.users}
      projects={data.projects.map((project) => ({
        id: project.id,
        title: project.title,
        clientId: project.clientId,
        client: project.client,
      }))}
      canSwitchBoards={data.canSwitchBoards}
      canEditBoard={data.canEditBoard}
      selectedUser={data.selectedUser}
      me={data.me}
    />
  );
}
