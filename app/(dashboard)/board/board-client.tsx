"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Add01Icon,
  Briefcase02Icon,
  Calendar01Icon,
  UserGroupIcon,
  ArrowRight02Icon,
  Cancel01Icon,
} from "hugeicons-react";
import {
  createPersonalBoardCard,
  createPersonalBoardColumn,
  movePersonalBoardCard,
} from "@/app/actions/boardActions";
import { cn } from "@/lib/utils";
import RealtimeRefresh from "@/components/RealtimeRefresh";

type BoardTask = {
  id: number;
  status: string;
  priority: string;
  source: string;
  createdAt?: string;
  updatedAt?: string;
};

type BoardCard = {
  id: number;
  title: string;
  description: string | null;
  position: number;
  enteredColumnAt?: string;
  task: BoardTask;
  project: { id: number; title: string };
  client: { id: number; name: string };
  owner: { id: number; name: string; role: string };
  assignedBy: { id: number; name: string; role: string } | null;
};

type BoardColumn = {
  id: number;
  title: string;
  code: string;
  kind: "TODO" | "IN_PROGRESS" | "DONE" | "CUSTOM";
  mappedTaskStatus: string;
  position: number;
  cards: BoardCard[];
};

type UserOption = {
  id: number;
  name: string;
  email: string;
  role: string;
  departmentId: number | null;
  department: { id: number; name: string; slug: string } | null;
};

type ProjectOption = {
  id: number;
  title: string;
  clientId: number;
  client: {
    id: number;
    name: string;
  };
};

type Props = {
  initialColumns: BoardColumn[];
  users: UserOption[];
  boardUsers: UserOption[];
  projects: ProjectOption[];
  canSwitchBoards: boolean;
  canEditBoard: boolean;
  selectedUser: UserOption;
  me: {
    id: number;
    name: string;
    role: string;
  };
};

type MovePayload = {
  cardId: number;
  targetColumnId: number;
  targetPosition: number;
};

type BoardFilter = "ALL" | "TODAY";

const CUSTOM_STATUS_OPTIONS = [
  "ASSIGNED",
  "CONFIRMED",
  "IN_PROGRESS",
  "PAUSED",
  "SUBMITTED",
  "REVISION",
  "DONE",
] as const;

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

export default function BoardClient({
  initialColumns,
  users,
  boardUsers,
  projects,
  canSwitchBoards,
  canEditBoard,
  selectedUser,
  me,
}: Props) {
  const router = useRouter();
  const [columns, setColumns] = useState<BoardColumn[]>(initialColumns);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);

  const [showCardForm, setShowCardForm] = useState(false);
  const [showColumnForm, setShowColumnForm] = useState(false);

  const [cardForm, setCardForm] = useState({
    title: "",
    description: "",
    projectId: projects[0]?.id ?? 0,
    clientId: projects[0]?.clientId ?? 0,
    assignedById: "",
    columnId: initialColumns.find((col) => col.kind === "TODO")?.id ?? initialColumns[0]?.id ?? 0,
  });

  const [columnForm, setColumnForm] = useState({
    title: "",
    mappedTaskStatus: "ASSIGNED",
  });

  const [draggingCardId, setDraggingCardId] = useState<number | null>(null);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("ALL");

  const activeProjects = useMemo(() => projects, [projects]);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const applyMoveLocal = (prev: BoardColumn[], payload: MovePayload) => {
    const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
    const sourceColumn = next.find((col) => col.cards.some((card) => card.id === payload.cardId));
    const targetColumn = next.find((col) => col.id === payload.targetColumnId);
    if (!sourceColumn || !targetColumn) return prev;

    const sourceIndex = sourceColumn.cards.findIndex((card) => card.id === payload.cardId);
    if (sourceIndex < 0) return prev;

    const [movingCard] = sourceColumn.cards.splice(sourceIndex, 1);
    const targetCards = targetColumn.cards;
    const insertAt = Math.max(0, Math.min(payload.targetPosition, targetCards.length));
    const nextCard =
      sourceColumn.id !== targetColumn.id
        ? { ...movingCard, enteredColumnAt: new Date().toISOString() }
        : movingCard;
    targetCards.splice(insertAt, 0, nextCard);

    for (const col of next) {
      col.cards = col.cards.map((card, index) => ({ ...card, position: index }));
    }

    return next;
  };

  const handleDrop = async (payload: MovePayload) => {
    if (!canEditBoard || boardFilter === "TODAY") return;
    if (!payload.cardId) return;

    const draggingCard = columns
      .flatMap((column) => column.cards)
      .find((card) => card.id === payload.cardId);
    const targetColumn = columns.find((column) => column.id === payload.targetColumnId);

    if (draggingCard?.task.status === "DONE" && targetColumn?.mappedTaskStatus !== "DONE") {
      setError("Done cards cannot be moved back to other columns");
      return;
    }

    setError("");
    setLoading(`move-${payload.cardId}`);

    const previous = columns;
    setColumns((prev) => applyMoveLocal(prev, payload));

    try {
      await movePersonalBoardCard(payload);
      router.refresh();
    } catch (err) {
      setColumns(previous);
      setError(err instanceof Error ? err.message : "Failed to move card");
    } finally {
      setLoading(null);
      setDraggingCardId(null);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditBoard) return;

    setError("");
    setLoading("create-card");

    try {
      const created = await createPersonalBoardCard({
        title: cardForm.title,
        description: cardForm.description || undefined,
        projectId: Number(cardForm.projectId),
        clientId: Number(cardForm.clientId),
        assignedById: cardForm.assignedById ? Number(cardForm.assignedById) : undefined,
        columnId: Number(cardForm.columnId),
      });
      setColumns((prev) =>
        prev.map((column) =>
          column.id !== created.columnId
            ? column
            : {
                ...column,
                cards: [
                  ...column.cards,
                  {
                    id: created.id,
                    title: created.title,
                    description: created.description,
                    position: created.position,
                    task: {
                      id: created.task.id,
                      status: created.task.status,
                      priority: created.task.priority,
                      source: created.task.source,
                      createdAt: new Date(created.task.createdAt).toISOString(),
                      updatedAt: new Date(created.task.updatedAt).toISOString(),
                    },
                    project: created.project,
                    client: created.client,
                    owner: created.owner,
                    enteredColumnAt: new Date(created.enteredColumnAt).toISOString(),
                    assignedBy: created.assignedBy,
                  },
                ].sort((a, b) => a.position - b.position),
              }
        )
      );
      setCardForm((prev) => ({ ...prev, title: "", description: "", assignedById: "" }));
      setShowCardForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create card");
    } finally {
      setLoading(null);
    }
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditBoard) return;

    setError("");
    setLoading("create-column");

    try {
      const created = await createPersonalBoardColumn({
        title: columnForm.title,
        mappedTaskStatus: columnForm.mappedTaskStatus as
          | "ASSIGNED"
          | "CONFIRMED"
          | "IN_PROGRESS"
          | "PAUSED"
          | "SUBMITTED"
          | "REVISION"
          | "DONE",
      });
      setColumns((prev) => [
        ...prev,
        {
          id: created.id,
          title: created.title,
          code: created.code,
          kind: created.kind,
          mappedTaskStatus: created.mappedTaskStatus,
          position: created.position,
          cards: [],
        },
      ].sort((a, b) => a.position - b.position));
      setColumnForm({ title: "", mappedTaskStatus: "ASSIGNED" });
      setShowColumnForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create column");
    } finally {
      setLoading(null);
    }
  };

  const selectedLabel = selectedUser.id === me.id ? "Your board" : `${selectedUser.name}'s board`;
  const formatCreatedAt = (value?: string) => {
    if (!value) return "Unknown date";
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isToday = (value?: string) => {
    if (!value) return false;
    const date = new Date(value);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const getFilteredCards = (column: BoardColumn) => {
    const sortedCards = column.cards.slice().sort((a, b) => a.position - b.position);
    if (boardFilter === "ALL") return sortedCards;

    return sortedCards.filter((card) => {
      if (column.kind === "TODO") {
        return isToday(card.task.createdAt);
      }

      return isToday(card.enteredColumnAt);
    });
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-20">
      <RealtimeRefresh intervalMs={5000} />
      <div className="flex flex-col gap-4 border-b border-gray-100 dark:border-white/10 pb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c91f41]">Personal Workflow</p>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">My Task Board</h1>
            <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium mt-1">
              {selectedLabel}
              {canEditBoard ? " • editable" : " • read only"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-1">
              {(["ALL", "TODAY"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBoardFilter(option)}
                  className={cn(
                    "h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                    boardFilter === option
                      ? "bg-[#c91f41] text-white"
                      : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  {option === "ALL" ? "All" : "Today"}
                </button>
              ))}
            </div>

            {canSwitchBoards && boardUsers.length > 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-3 h-11">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                  View
                </span>
                <select
                  value={selectedUser.id}
                  onChange={(e) => router.push(`/board?userId=${e.target.value}`)}
                  className="bg-transparent text-sm font-semibold outline-none text-gray-900 dark:text-white"
                >
                  {boardUsers.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} {person.id === me.id ? "(me)" : `(${formatRole(person.role)})`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {canEditBoard ? (
              <>
                <button
                  onClick={() => setShowCardForm((prev) => !prev)}
                  className="h-11 px-4 rounded-xl bg-[#c91f41] text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Add01Icon className="h-4 w-4" />
                  New Card
                </button>
                <button
                  onClick={() => setShowColumnForm((prev) => !prev)}
                  className="h-11 px-4 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 text-[11px] font-black uppercase tracking-widest text-gray-700 dark:text-zinc-300"
                >
                  Add Column
                </button>
              </>
            ) : (
              <div className="h-11 px-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 flex items-center">
                Read only
              </div>
            )}
          </div>
        </div>

        {error ? (
          <div className="text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3">
            {error}
          </div>
        ) : null}

        {canEditBoard && showCardForm ? (
          <form
            onSubmit={handleCreateCard}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-2xl p-4"
          >
            <input
              value={cardForm.title}
              onChange={(e) => setCardForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Card title"
              className="h-11 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm font-semibold"
              required
            />
            <select
              value={cardForm.projectId}
              onChange={(e) => {
                const projectId = Number(e.target.value);
                const selected = activeProjects.find((project) => project.id === projectId);
                setCardForm((prev) => ({
                  ...prev,
                  projectId,
                  clientId: selected?.clientId ?? prev.clientId,
                }));
              }}
              className="h-11 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm font-semibold"
              required
            >
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} ({project.client.name})
                </option>
              ))}
            </select>
            <select
              value={cardForm.columnId}
              onChange={(e) => setCardForm((prev) => ({ ...prev, columnId: Number(e.target.value) }))}
              className="h-11 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm font-semibold"
              required
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
            <select
              value={cardForm.assignedById}
              onChange={(e) => setCardForm((prev) => ({ ...prev, assignedById: e.target.value }))}
              className="h-11 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm font-semibold"
            >
              <option value="">Assigned by (optional)</option>
              {users.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} ({formatRole(person.role)})
                </option>
              ))}
            </select>
            <textarea
              value={cardForm.description}
              onChange={(e) => setCardForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description (optional)"
              className="md:col-span-2 lg:col-span-3 h-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm font-medium resize-none"
            />
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCardForm(false)}
                className="h-10 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading === "create-card"}
                className="h-10 px-4 rounded-xl bg-[#c91f41] text-white text-sm font-bold"
              >
                {loading === "create-card" ? "Creating..." : "Create Card"}
              </button>
            </div>
          </form>
        ) : null}

        {canEditBoard && showColumnForm ? (
          <form
            onSubmit={handleCreateColumn}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-2xl p-4"
          >
            <input
              value={columnForm.title}
              onChange={(e) => setColumnForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Column title"
              className="h-11 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm font-semibold"
              required
            />
            <select
              value={columnForm.mappedTaskStatus}
              onChange={(e) => setColumnForm((prev) => ({ ...prev, mappedTaskStatus: e.target.value }))}
              className="h-11 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm font-semibold"
            >
              {CUSTOM_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowColumnForm(false)}
                className="h-10 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading === "create-column"}
                className="h-10 px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-bold"
              >
                {loading === "create-column" ? "Adding..." : "Add Column"}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((column) => {
              const sortedCards = getFilteredCards(column);
              return (
                <div
                  key={column.id}
                  onDragOver={(e) => {
                    if (canEditBoard && boardFilter === "ALL") e.preventDefault();
                  }}
                  onDrop={() => {
                    if (canEditBoard && boardFilter === "ALL" && draggingCardId) {
                      void handleDrop({
                        cardId: draggingCardId,
                        targetColumnId: column.id,
                        targetPosition: sortedCards.length,
                      });
                    }
                  }}
                  className="w-[340px] shrink-0 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-4 h-[calc(100vh-220px)] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        {column.title}
                      </h2>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
                        Maps to {column.mappedTaskStatus.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span className="h-7 px-2 rounded-lg bg-gray-100 dark:bg-white/10 text-xs font-black text-gray-600 dark:text-zinc-400 flex items-center">
                      {sortedCards.length}
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-3">
                    {sortedCards.map((card, index) => (
                      <div
                        key={card.id}
                        onClick={() => setActiveCard(card)}
                        onDragOver={(e) => {
                          if (canEditBoard && boardFilter === "ALL") e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.stopPropagation();
                          if (canEditBoard && boardFilter === "ALL" && draggingCardId) {
                            void handleDrop({
                              cardId: draggingCardId,
                              targetColumnId: column.id,
                              targetPosition: index,
                            });
                          }
                        }}
                        draggable={canEditBoard && boardFilter === "ALL" && card.task.status !== "DONE"}
                        onDragStart={() => {
                          if (canEditBoard && boardFilter === "ALL" && card.task.status !== "DONE") {
                            setDraggingCardId(card.id);
                          }
                        }}
                        onDragEnd={() => setDraggingCardId(null)}
                        className={cn(
                          "group rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 transition-all duration-200",
                          canEditBoard && boardFilter === "ALL" && "cursor-grab active:cursor-grabbing hover:border-[#c91f41]/25 hover:shadow-sm",
                          loading === `move-${card.id}` && "opacity-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                            {card.title}
                          </p>
                          {canEditBoard ? (
                            <ArrowRight02Icon className="h-4 w-4 text-gray-300 dark:text-zinc-600 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          ) : null}
                        </div>

                        <div className="mt-3 space-y-2 text-[11px] text-gray-500 dark:text-zinc-500 font-semibold">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserGroupIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{card.owner.name}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Briefcase02Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{card.assignedBy?.name || "Unassigned"}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Calendar01Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{formatCreatedAt(card.task.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {sortedCards.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-5 text-center text-xs font-semibold text-gray-400 dark:text-zinc-500">
                        Drop a card here
                      </div>
                    ) : null}
                  </div>

                  {boardFilter === "TODAY" ? (
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600">
                      {column.kind === "TODO"
                        ? "Showing cards created today"
                        : "Showing cards moved here today"}
                    </p>
                  ) : null}
                  {canEditBoard && boardFilter === "TODAY" ? (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      Switch to All to move cards
                    </p>
                  ) : null}
                </div>
              );
            })}
        </div>
      </div>

      {activeCard ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveCard(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white dark:bg-[#0b0b0b] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100 dark:border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c91f41]">Card details</p>
                <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white mt-1">
                  {activeCard.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium mt-1">
                  Task #{activeCard.task.id} • {activeCard.task.status.replaceAll("_", " ")}
                </p>
              </div>
              <button
                onClick={() => setActiveCard(null)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Close details"
              >
                <Cancel01Icon className="h-6 w-6 text-gray-500 dark:text-zinc-400" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Detail label="Assigned to" value={activeCard.owner.name} />
              <Detail label="Assigned by" value={activeCard.assignedBy?.name || "Unassigned"} />
              <Detail label="Created" value={formatCreatedAt(activeCard.task.createdAt)} />
              <Detail label="Client" value={activeCard.client.name} />
              <Detail label="Project" value={activeCard.project.title} />
              <Detail label="Source" value={activeCard.task.source.replaceAll("_", " ")} />
              <Detail label="Priority" value={activeCard.task.priority.replaceAll("_", " ")} />
              <Detail label="Status" value={activeCard.task.status.replaceAll("_", " ")} />

              <div className="md:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 mb-2">
                  Description
                </p>
                <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 text-sm text-gray-700 dark:text-zinc-300 min-h-[96px] whitespace-pre-wrap">
                  {activeCard.description?.trim() || "No description provided."}
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-gray-900 dark:text-white break-words">{value}</p>
    </div>
  );
}
