"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Search, Star, Plus, MoreHorizontal, CalendarDays, Paperclip, CheckSquare, AlignLeft, UserPlus, X, Check, Layout, Settings, Users, Briefcase, Globe, Lock, Eye, Clock, Hash, Trash2, Copy, FileText, Archive, ChevronDown, List as ListIcon, MessageSquare, ChevronRight, Share2, Filter, Menu, Circle, CheckCircle2, BookOpen, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import RichTextEditor from "@/components/RichTextEditor";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { createWorkspace, createBoard, getBoardData, inviteToBoard, createList, deleteList, toggleListRestrict, createCard, toggleCardComplete, deleteCard, moveCard, addCardLabel, removeCardLabel, addCardMember, removeCardMember, addChecklist, deleteChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem, addCardAttachment, deleteCardAttachment, addCardActivity, updateCardTitle, updateCardDescription, setCardDueDate, renameList, moveList, toggleBoardStar, deleteWorkspace, deleteBoard, updateBoardVisibility, setIncludeInLogs, setCardAssignee, recordBoardVisit, updateBoardBackground, renameChecklist } from "@/app/actions/boardActions";
import { createNotification } from "@/app/actions/notificationActions";
import { formatDistanceToNow } from "date-fns";

/**
 * DATA TYPES
 */

type SystemUser = {
  id: number;
  name: string;
  email: string;
};

type WorkspaceData = {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  boards: any[];
  members: any[];
};

type Member = {
  id: string;
  name: string;
  email: string;
  color: string;
};

type Label = {
  id: string;
  name: string;
  color: string;
};

type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  assignedMemberId?: string;
};

type Checklist = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

type ActivityEntry = {
  id: string;
  type: "COMMENT" | "SYSTEM";
  actor: string;
  message: string;
  createdAt: string;
};

type Attachment = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

type CardData = {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  isCompleted?: boolean;
  includeInLogs?: boolean;
  assignedToUserId?: number | null;
  labels: Label[];
  memberIds: string[];
  checklists: Checklist[];
  attachments: Attachment[];
  activity: ActivityEntry[];
  position: number;
  task?: {
    id: number;
    status: string;
    assignedUserId: number | null;
  } | null;
};

type ListData = {
  id: string;
  title: string;
  position: number;
  cards: CardData[];
  createdById?: number | null;
  restricted?: boolean;
};

type BoardData = {
  id: string;
  title: string;
  visibility: "PRIVATE" | "WORKSPACE" | "PUBLIC";
  background: string;
  starred: boolean;
  memberIds: string[];
  workspaceName: string;
  updatedAt: number;
  lastVisitedAt: number;
};

type CardPointer = {
  listId: string;
  cardId: string;
};

/**
 * CONSTANTS & UTILS
 */

const MEMBER_COLORS = [
  "bg-rose-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-indigo-500", "bg-fuchsia-500", "bg-cyan-500"
];

const BOARD_COLORS = [
  { name: "Sky", bg: "bg-sky-600" },
  { name: "Rose", bg: "bg-rose-600" },
  { name: "Emerald", bg: "bg-emerald-600" },
  { name: "Amber", bg: "bg-amber-600" },
  { name: "Indigo", bg: "bg-indigo-600" },
  { name: "Fuchsia", bg: "bg-fuchsia-600" },
  { name: "Cyan", bg: "bg-cyan-600" },
  { name: "Teal", bg: "bg-teal-600" },
  { name: "Violet", bg: "bg-violet-600" },
  { name: "Pink", bg: "bg-pink-600" },
  { name: "Lime", bg: "bg-lime-600" },
  { name: "Orange", bg: "bg-orange-600" },
  { name: "Slate", bg: "bg-slate-600" },
  { name: "Zinc", bg: "bg-zinc-600" },
  { name: "Stone", bg: "bg-stone-600" },
];

const BOARD_LABELS: Label[] = [
  { id: "l-blue", name: "Design", color: "bg-sky-500" },
  { id: "l-green", name: "Development", color: "bg-emerald-500" },
  { id: "l-yellow", name: "Review", color: "bg-amber-500" },
  { id: "l-red", name: "Urgent", color: "bg-rose-500" },
  { id: "l-purple", name: "Research", color: "bg-indigo-500" }
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDueStatus(dueDate: string, isCompleted?: boolean) {
  if (isCompleted) return "bg-emerald-500 text-white";
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "bg-rose-100 text-rose-700";
  if (days <= 2) return "bg-amber-100 text-amber-700";
  return "bg-zinc-100 text-zinc-600";
}

function getUserColor(userId: number, name: string) {
  if (!name) return "bg-zinc-500 text-white";
  if (name.toLowerCase().includes("admin") || userId === 1 || userId === 9999) {
    return "bg-[#c91f41] text-white";
  }
  const colors = [
    "bg-sky-500 text-white",
    "bg-emerald-500 text-white",
    "bg-amber-500 text-white",
    "bg-indigo-500 text-white",
    "bg-fuchsia-500 text-white",
    "bg-cyan-500 text-white",
    "bg-rose-500 text-white",
    "bg-teal-500 text-white"
  ];
  return colors[userId % colors.length];
}

/**
 * COMPONENT
 */

export default function BoardWorkbenchClient({
  currentUser,
  systemUsers,
  initialWorkspaces,
  initialActiveBoardId,
}: {
  currentUser: { id: number; name: string; email: string; role?: string };
  systemUsers: SystemUser[];
  initialWorkspaces: WorkspaceData[];
  initialActiveBoardId?: string;
}) {
  const members = useMemo(() => {
    return systemUsers.map((u) => ({
      id: `u-${u.id}`,
      name: u.name,
      email: u.email,
      color: getUserColor(u.id, u.name)
    }));
  }, [systemUsers]);

  const selfMemberId = `u-${currentUser.id}`;

  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>(initialWorkspaces);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(initialActiveBoardId || null);
  
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [listsByBoard, setListsByBoard] = useState<Record<string, ListData[]>>({});
  const [boardTeamMembers, setBoardTeamMembers] = useState<SystemUser[]>([]);
  const [cardSearch, setCardSearch] = useState("");

  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");
  const [switcherTab, setSwitcherTab] = useState<"BOARDS" | "WORKSPACES">("BOARDS");
  const [selectedWsId, setSelectedWsId] = useState<number | null>(null);
  const [boardsPage, setBoardsPage] = useState(1);
  const [wsBoardsPage, setWsBoardsPage] = useState(1);
  const boardsScrollRef = useRef<HTMLDivElement>(null);

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardWsId, setNewBoardWsId] = useState<number | "">(initialWorkspaces[0]?.id || "");
  const [newBoardVisibility, setNewBoardVisibility] = useState<BoardData["visibility"]>("WORKSPACE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [activeCardRange, setActiveCardRange] = useState<CardPointer | null>(null);

  // Card Popup States
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);
  const [memberSearchContext, setMemberSearchContext] = useState<"BOARD" | "CARD" | "WORKSPACE">("BOARD");
  const [isLabelEditorOpen, setIsLabelEditorOpen] = useState(false);
  const [labelEditorMode, setLabelEditorMode] = useState<"SELECT" | "CREATE">("SELECT");
  const [newLabelColor, setNewLabelColor] = useState(MEMBER_COLORS[0]);
  const [newLabelName, setNewLabelName] = useState("");
  
  const [isChecklistAddOpen, setIsChecklistAddOpen] = useState(false);
  const [isDateSelectionOpen, setIsDateSelectionOpen] = useState(false);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [activeComment, setActiveComment] = useState("");
  const [checklistAssigneeId, setChecklistAssigneeId] = useState<string | null>(null);

  const [addingCardToListId, setAddingCardToListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const [activeListMenuId, setActiveListMenuId] = useState<string | null>(null);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [boardMembers, setBoardMembers] = useState<Record<string, string[]>>({});

  // Auto-close popups on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".popup-trigger") && !target.closest(".popup-content")) {
        setIsMemberSearchOpen(false);
        setIsLabelEditorOpen(false);
        setLabelEditorMode("SELECT");
        setIsChecklistAddOpen(false);
        setIsDateSelectionOpen(false);
        setIsAddingFile(false);
        setActiveListMenuId(null);
      }
    };
    if (isMemberSearchOpen || isLabelEditorOpen || isChecklistAddOpen || isDateSelectionOpen || isAddingFile || activeListMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMemberSearchOpen, isLabelEditorOpen, isChecklistAddOpen, isDateSelectionOpen, isAddingFile, activeListMenuId]);

  const [draggedCard, setDraggedCard] = useState<{ listId: string; cardId: string } | null>(null);
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ listId: string; index: number } | null>(null);

  const activeWorkspace = useMemo(() => {
    if (!activeBoardId) return null;
    const boardDbId = Number(activeBoardId.replace("b-", ""));
    return workspaces.find(ws => ws.boards.some((b: any) => b.id === boardDbId));
  }, [workspaces, activeBoardId]);

  useEffect(() => {
    const allBoards: BoardData[] = workspaces.flatMap(ws => ws.boards.map((b: any) => {
      const bId = `b-${b.id}`;
      const wsMemberIds = ws.members.map((m: any) => `u-${m.user?.id || m.userId || m.id}`) || [];
      const defaultMembers = wsMemberIds.length > 0 ? wsMemberIds : [selfMemberId];
      const savedMembers = boardMembers[bId] || b.memberIds || defaultMembers;
      const uniqueMembers = Array.from(new Set([...savedMembers, selfMemberId]));
      const lastVisited = b.visits?.[0]?.visitedAt ? new Date(b.visits[0].visitedAt).getTime() : 0;
      return {
        id: bId,
        title: b.title,
        visibility: (b.visibility || "WORKSPACE") as any,
        background: b.background || "bg-sky-600",
        starred: b.isStarred || false,
        memberIds: uniqueMembers,
        workspaceName: ws.name,
        updatedAt: new Date(b.updatedAt).getTime(),
        lastVisitedAt: lastVisited
      };
    }));

    setBoards(prev => {
      return allBoards.map(nb => {
        const existing = prev.find(p => p.id === nb.id);
        if (existing && existing.id === activeBoardId && existing.memberIds.length > 0) {
          return { ...nb, memberIds: existing.memberIds };
        }
        return nb;
      });
    });

    if (initialActiveBoardId && allBoards.some(b => b.id === initialActiveBoardId)) {
      setActiveBoardId(initialActiveBoardId);
    } else if (allBoards.length > 0 && !activeBoardId) {
      setActiveBoardId(allBoards[0].id);
    }
  }, [workspaces, selfMemberId, boardMembers, boardTeamMembers, activeBoardId, initialActiveBoardId]);

  const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);
  const currentLists = useMemo(() => (activeBoardId ? listsByBoard[activeBoardId] || [] : []), [listsByBoard, activeBoardId]);

  // Fetch board data from DB
  const fetchBoardData = async (boardIdStr: string) => {
    const dbId = Number(boardIdStr.replace("b-", ""));
    try {
      const data = await getBoardData(dbId);
      if (!data) return;
      
      const listData: ListData[] = data.lists.map((l: any) => ({
        id: `l-${l.id}`,
        title: l.title,
        position: l.position,
        createdById: l.createdById,
        restricted: l.isRestricted,
        cards: l.cards.map((c: any) => ({
          id: `c-${c.id}`,
          title: c.title,
          description: c.description || "",
          position: c.position,
          dueDate: c.dueDate ? new Date(c.dueDate).toISOString() : undefined,
          isCompleted: c.isCompleted,
          includeInLogs: c.includeInLogs ?? true,
          assignedToUserId: c.assignedToUserId || null,
          labels: c.labels.map((lb: any) => ({ id: `lb-${lb.id}`, name: lb.name, color: lb.color })),
          memberIds: c.members.map((m: any) => `u-${m.user.id}`),
          checklists: c.checklists.map((cl: any) => ({
            id: `cl-${cl.id}`,
            title: cl.title,
            items: cl.items.map((it: any) => ({
              id: `ci-${it.id}`,
              title: it.title,
              done: it.isDone,
              assignedMemberId: it.assignedUserId ? `u-${it.assignedUserId}` : undefined
            }))
          })),
          attachments: c.attachments.map((a: any) => ({ id: `at-${a.id}`, name: a.name, url: a.url, createdAt: new Date(a.createdAt).toISOString() })),
          activity: c.activity.map((a: any) => ({ id: `ba-${a.id}`, type: a.type as "COMMENT" | "SYSTEM", actor: a.actorName, message: a.message, createdAt: new Date(a.createdAt).toISOString() })),
          task: c.task || null,
        }))
      }));

      setListsByBoard(prev => ({ ...prev, [boardIdStr]: listData }));
      const teamMembers = data.members.map((m: any) => m.user);
      const wsMembers = (data.workspace?.members || []).map((m: any) => m.user).filter(Boolean);
      const allTeamMembers = [...teamMembers];
      for (const wm of wsMembers) {
        if (!allTeamMembers.find((m: any) => m.id === wm.id)) {
          allTeamMembers.push(wm);
        }
      }
      setBoardTeamMembers(allTeamMembers);

      // Sync board background from DB into workspaces so useEffect rebuild doesn't overwrite local color
      setWorkspaces(prev => prev.map(ws => ({
        ...ws,
        boards: ws.boards.map((b: any) => b.id === dbId ? { ...b, background: data.background || b.background } : b)
      })));

      const wsMemberIds = (data.workspace?.members || []).map((m: any) => `u-${m.userId || m.user?.id}`);
      const boardMemberIds = teamMembers.map((m: any) => `u-${m.id}`);
      const dbMemberIds = Array.from(new Set([
        ...boardMemberIds,
        ...wsMemberIds,
        selfMemberId
      ]));
      setBoards(prev => prev.map(b => b.id === boardIdStr ? { ...b, memberIds: dbMemberIds } : b));
    } catch (e) {
      console.error("Failed to fetch board data:", e);
    }
  };

  // Load board data from DB when active board changes
  useEffect(() => {
    if (activeBoardId) {
      fetchBoardData(activeBoardId);
    }
  }, [activeBoardId]);

  // Polling for realtime updates (every 10s)
  useEffect(() => {
    if (!activeBoardId) return;
    const interval = setInterval(() => {
      fetchBoardData(activeBoardId);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeBoardId]);

  // Reset switcher pagination when tab/search/selection changes
  useEffect(() => {
    setBoardsPage(1);
    setWsBoardsPage(1);
  }, [switcherTab, switcherSearch, selectedWsId]);

  // Infinite scroll for switcher
  useEffect(() => {
    const el = boardsScrollRef.current;
    if (!el) return;
    const handler = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        if (switcherTab === "BOARDS") setBoardsPage(p => p + 1);
        if (switcherTab === "WORKSPACES" && selectedWsId) setWsBoardsPage(p => p + 1);
      }
    };
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, [switcherTab, selectedWsId]);

  const filteredLists = useMemo(() => {
    const sortedLists = currentLists.map(list => {
      const sortedCards = [...list.cards].sort((a, b) => {
        const aCompleted = !!a.isCompleted;
        const bCompleted = !!b.isCompleted;
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;
        return 0; // maintain relative position
      });
      return { ...list, cards: sortedCards };
    });

    if (!cardSearch.trim()) return sortedLists;
    const term = cardSearch.toLowerCase().trim();
    return sortedLists.map(list => ({
      ...list,
      cards: list.cards.filter(card => 
        card.title.toLowerCase().includes(term) || 
        (card.description || "").toLowerCase().includes(term)
      )
    }));
  }, [currentLists, cardSearch]);
  
  const handleBoardSelect = (id: string) => {
    setActiveBoardId(id);
    setShowSwitcher(false);
    const dbId = Number(id.replace("b-", ""));
    if (dbId) recordBoardVisit(dbId).catch(() => {});
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    setIsSubmitting(true);
    try {
      const ws = await createWorkspace({ name: newWsName.trim() });
      setWorkspaces(prev => [...prev, { ...ws, boards: [], members: [] }]);
      setNewWsName("");
      setShowCreateWs(false);
      setNewBoardWsId(ws.id);
      setShowCreateBoard(true);
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;
    const wsId = Number(newBoardWsId);
    if (!wsId || isNaN(wsId)) { alert("Please select a workspace."); return; }
    setIsSubmitting(true);
    try {
      const board = await createBoard({ 
        workspaceId: wsId, 
        title: newBoardTitle.trim(),
        visibility: newBoardVisibility as any
      });
      setWorkspaces(prev => prev.map(ws => ws.id === wsId ? { ...ws, boards: [...ws.boards, board] } : ws));
      setNewBoardTitle("");
      setShowCreateBoard(false);
      setActiveBoardId(`b-${board.id}`);
    } catch (e: any) { console.error(e); alert(e?.message || "Failed to create board. Please try again."); } finally { setIsSubmitting(false); }
  };

  const handleAddList = async () => {
    if (!newListTitle.trim() || !activeBoardId) return;
    const dbId = Number(activeBoardId.replace("b-", ""));
    try {
      const list = await createList(dbId, newListTitle.trim());
      const newList: ListData = {
        id: `l-${list.id}`,
        title: list.title,
        position: list.position,
        createdById: list.createdById,
        restricted: list.isRestricted,
        cards: [],
      };
      setListsByBoard(prev => ({
        ...prev,
        [activeBoardId]: [...(prev[activeBoardId] || []), newList]
      }));
      setNewListTitle("");
      setAddingList(false);
    } catch (e: any) { alert(e.message || "Failed to create list"); }
  };

  const handleDeleteList = async (listId: string) => {
    if (!activeBoardId) return;
    const dbId = Number(listId.replace("l-", ""));
    try {
      await deleteList(dbId);
      setListsByBoard(prev => ({
        ...prev,
        [activeBoardId]: (prev[activeBoardId] || []).filter(l => l.id !== listId)
      }));
    } catch (e: any) { alert(e.message || "Failed to delete list"); }
    setActiveListMenuId(null);
  };

  const handleToggleListRestriction = async (listId: string) => {
    if (!activeBoardId) return;
    const dbId = Number(listId.replace("l-", ""));
    try {
      await toggleListRestrict(dbId);
      setListsByBoard(prev => ({
        ...prev,
        [activeBoardId]: (prev[activeBoardId] || []).map(l => 
          l.id === listId ? { ...l, restricted: !l.restricted } : l
        )
      }));
    } catch (e: any) { alert(e.message || "Failed to update list"); }
    setActiveListMenuId(null);
  };

  const handleAddCard = async (listId: string, title: string) => {
    if (!title.trim() || !activeBoardId) return;
    const targetList = (listsByBoard[activeBoardId] || []).find(l => l.id === listId);
    if (targetList?.restricted) {
      alert("This list is restricted!");
      return;
    }
    const dbId = Number(listId.replace("l-", ""));
    try {
      const card = await createCard(dbId, title.trim());
      const newCard: CardData = {
        id: `c-${card.id}`,
        title: card.title,
        description: "",
        position: card.position,
        labels: [],
        memberIds: [selfMemberId],
        checklists: [],
        attachments: [],
        activity: [{ id: createId("act"), type: "SYSTEM", actor: "System", message: "Card created", createdAt: new Date().toISOString() }]
      };
      setListsByBoard(prev => ({
        ...prev,
        [activeBoardId]: (prev[activeBoardId] || []).map(l => l.id === listId ? { ...l, cards: [...l.cards, newCard] } : l)
      }));
    } catch (e: any) { alert(e.message || "Failed to create card"); }
  };

  const updateActiveCard = (updater: (card: CardData) => CardData) => {
    if (!activeCardRange || !activeBoardId) return;
    const targetList = (listsByBoard[activeBoardId] || []).find(l => l.id === activeCardRange.listId);
    if (targetList?.restricted) {
      alert("This list is restricted and cannot be modified!");
      return;
    }
    setListsByBoard(prev => ({
      ...prev,
      [activeBoardId]: (prev[activeBoardId] || []).map(l => 
        l.id === activeCardRange.listId 
          ? { ...l, cards: l.cards.map(c => c.id === activeCardRange.cardId ? updater(c) : c) }
          : l
      )
    }));
  };

  const handleInviteToCard = async (uId: number) => {
    const memberId = `u-${uId}`;
    if (!activeCardRange) return;
    const cardDbId = Number(activeCardRange.cardId.replace("c-", ""));
    
    const isCurrentlyAssigned = activeCard?.card.memberIds.includes(memberId) || false;
    
    try {
      if (isCurrentlyAssigned) {
        await removeCardMember(cardDbId, uId);
      } else {
        await addCardMember(cardDbId, uId);
      }
      updateActiveCard(c => ({
        ...c,
        memberIds: isCurrentlyAssigned
          ? c.memberIds.filter(id => id !== memberId)
          : [...c.memberIds, memberId]
      }));
      try {
        await createNotification(
          uId,
          "BOARD_UPDATED",
          "Card Update",
          `${currentUser.name} ${isCurrentlyAssigned ? "removed you from" : "assigned you to"} "${activeCard?.card.title}"`,
          ""
        );
      } catch (e) { console.error(e); }
    } catch (e: any) { alert(e.message || "Failed to update card member"); }
  };

  const handleInviteToWorkspace = async (wsId: number, uId: number) => {
    const ws = workspaces.find(w => w.id === wsId);
    if (!ws) return;
    const memberId = `u-${uId}`;
    if (ws.members.some(m => `u-${m.user?.id || m.userId || m.id}` === memberId)) return;

    const userToAdd = systemUsers.find(su => su.id === uId);
    if (!userToAdd) return;

    setWorkspaces(prev => prev.map(w => w.id === wsId ? { ...w, members: [...w.members, { id: Date.now(), userId: uId, user: userToAdd }] } : w));

    try {
      await createNotification(
        uId,
        "WORKSPACE_INVITE",
        "Workspace Invite",
        `${currentUser.name} added you to workspace "${ws.name}"`,
        ""
      );
    } catch (e) { console.error(e); }
  };

  const handleInviteToBoard = async (uId: number) => {
    if (!activeBoard) return;
    const boardDbId = Number(activeBoard.id.replace("b-", ""));
    const memberId = `u-${uId}`;
    if (activeBoard.memberIds.includes(memberId)) return;

    try {
      await inviteToBoard(boardDbId, uId);
      setWorkspaces(prev => prev.map(ws => ({
        ...ws,
        boards: ws.boards.map((b: any) => b.id === boardDbId ? { ...b, memberIds: [...(b.memberIds || [selfMemberId]), memberId] } : b)
      })));
      // Refresh board data to get the updated member list
      fetchBoardData(activeBoard.id);

      try {
        await createNotification(
          uId,
          "BOARD_INVITE",
          "Invited to Board",
          `${currentUser.name} invited you to join the board "${activeBoard.title}"`,
          `/board?active=${activeBoard.id}`
        );
      } catch (e) { console.error(e); }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to send invite. Please try again.");
    }
  };

  const handleAddComment = async () => {
    if (!activeComment || !activeComment.trim() || !activeCardRange) return;
    const cardDbId = Number(activeCardRange.cardId.replace("c-", ""));
    
    try {
      await addCardActivity(cardDbId, activeComment.trim());
      updateActiveCard(c => ({
        ...c,
        activity: [
          {
            id: createId("act"),
            type: "COMMENT",
            actor: currentUser.name,
            message: activeComment,
            createdAt: new Date().toISOString()
          },
          ...c.activity
        ]
      }));
      setActiveComment("");
    } catch (e: any) { alert(e.message || "Failed to add comment"); }
  };

  const [cardWarningId, setCardWarningId] = useState<string | null>(null);
  const [cardDetailWarning, setCardDetailWarning] = useState<string | null>(null);

  // Clear warning after 3 seconds
  useEffect(() => {
    if (cardWarningId) {
      const t = setTimeout(() => setCardWarningId(null), 3000);
      return () => clearTimeout(t);
    }
    if (cardDetailWarning) {
      const t = setTimeout(() => setCardDetailWarning(null), 3000);
      return () => clearTimeout(t);
    }
  }, [cardWarningId, cardDetailWarning]);

  const canMarkCardComplete = (card: CardData) => {
    if (!card.checklists || card.checklists.length === 0) return true;
    return card.checklists.every(cl => cl.items.every(i => i.done));
  };

  const toggleCardCompletion = async (listId: string, cardId: string) => {
    if (!activeBoardId) return;
    const currentListsForBoard = listsByBoard[activeBoardId] || [];
    const list = currentListsForBoard.find(l => l.id === listId);
    const card = list?.cards.find(c => c.id === cardId);
    if (!card) return;

    if (!card.isCompleted) {
      if (!card.assignedToUserId) {
        setCardDetailWarning("Assign someone to this card first!");
        return;
      }
      if (card.assignedToUserId !== currentUser.id) {
        setCardDetailWarning("Only the assigned member can mark this card as done!");
        return;
      }
      if (!canMarkCardComplete(card)) {
        setCardWarningId(cardId);
        return;
      }
    }

    const dbId = Number(cardId.replace("c-", ""));
    try {
      await toggleCardComplete(dbId);
      setListsByBoard(prev => ({
        ...prev,
        [activeBoardId]: (prev[activeBoardId] || []).map(l => l.id === listId ? {
          ...l,
          cards: l.cards.map(c => c.id === cardId ? { ...c, isCompleted: !c.isCompleted } : c)
        } : l)
      }));
    } catch (e: any) { alert(e.message || "Failed to update card"); }
  };

  const onDragStartCard = (e: React.DragEvent, listId: string, cardId: string) => {
    e.stopPropagation();
    setDraggedCard({ listId, cardId });
    e.dataTransfer.setData("type", "card");
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragStartList = (e: React.DragEvent, listId: string) => {
    setDraggedListId(listId);
    e.dataTransfer.setData("type", "list");
  };

  const onDragOver = (e: React.DragEvent, listId: string, index: number) => {
    e.preventDefault();
    if (draggedCard) setDropIndicator({ listId, index });
    if (draggedListId) setDropIndicator({ listId, index });
  };

  const onDrop = async (e: React.DragEvent, targetListId: string, targetIndex: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    if (!activeBoardId) return;

    if (type === "card" && draggedCard) {
      const cardDbId = Number(draggedCard.cardId.replace("c-", ""));
      const targetListDbId = Number(targetListId.replace("l-", ""));
      try {
        await moveCard(cardDbId, targetListDbId, targetIndex);
      } catch (err: any) { alert(err.message || "Failed to move card"); setDraggedCard(null); setDraggedListId(null); setDropIndicator(null); return; }

      setListsByBoard(prev => {
        const boardLists = [...(prev[activeBoardId] || [])];
        const sourceListIdx = boardLists.findIndex(l => l.id === draggedCard.listId);
        const targetListIdx = boardLists.findIndex(l => l.id === targetListId);
        
        const sourceList = { ...boardLists[sourceListIdx], cards: [...boardLists[sourceListIdx].cards] };
        const cardIdx = sourceList.cards.findIndex(c => c.id === draggedCard.cardId);
        const [card] = sourceList.cards.splice(cardIdx, 1);

        if (sourceListIdx === targetListIdx) {
          sourceList.cards.splice(targetIndex, 0, card);
          boardLists[sourceListIdx] = sourceList;
        } else {
          const targetList = { ...boardLists[targetListIdx], cards: [...boardLists[targetListIdx].cards] };
          targetList.cards.splice(targetIndex, 0, card);
          boardLists[sourceListIdx] = sourceList;
          boardLists[targetListIdx] = targetList;
        }
        return { ...prev, [activeBoardId]: boardLists };
      });
    }

    if (type === "list" && draggedListId) {
       const listDbId = Number(draggedListId.replace("l-", ""));
       try { await moveList(listDbId, targetIndex); } catch (err: any) { alert(err.message || "Failed to move list"); setDraggedCard(null); setDraggedListId(null); setDropIndicator(null); return; }
       setListsByBoard(prev => {
         const boardLists = [...(prev[activeBoardId] || [])];
         const sourceIdx = boardLists.findIndex(l => l.id === draggedListId);
         const [list] = boardLists.splice(sourceIdx, 1);
         boardLists.splice(targetIndex, 0, list);
         return { ...prev, [activeBoardId]: boardLists };
       });
    }

    setDraggedCard(null);
    setDraggedListId(null);
    setDropIndicator(null);
  };

  const canEdit = useMemo(() => {
    if (!activeBoard) return false;
    return activeBoard.memberIds.includes(selfMemberId);
  }, [activeBoard, selfMemberId]);

  const filteredBoards = useMemo(() => {
    const term = (switcherSearch || "").toLowerCase().trim();
    return boards.filter(b => b.title.toLowerCase().includes(term));
  }, [boards, switcherSearch]);

  const workspaceToDisplay = useMemo(() => {
    if (!selectedWsId) return null;
    return workspaces.find(ws => ws.id === selectedWsId);
  }, [selectedWsId, workspaces]);

  const activeCard = useMemo(() => {
    if (!activeCardRange) return null;
    const list = currentLists.find(l => l.id === activeCardRange.listId);
    const card = list?.cards.find(c => c.id === activeCardRange.cardId);
    return card && list ? { list, card } : null;
  }, [activeCardRange, currentLists]);

  const AvatarPile = ({ ids, size = "h-7 w-7", max = 4 }: { ids: string[]; size?: string; max?: number }) => {
    const visible = ids.slice(0, max);
    const extra = ids.length - max;
    return (
      <div className="flex -space-x-2">
        {visible.map(id => {
          const m = members.find(u => u.id === id);
          const userId = Number(id.replace('u-', ''));
          return (
            <div key={id} className={cn("rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shrink-0", size, getUserColor(userId, m?.name || ''))} title={m?.name}>
              {m ? initials(m.name) : "?"}
            </div>
          );
        })}
        {extra > 0 && (
          <div className={cn("rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-zinc-600 shrink-0", size)}>
            +{extra}
          </div>
        )}
      </div>
    );
  };

  const ChecklistProgress = ({ checklist }: { checklist: Checklist }) => {
    const total = checklist.items.length;
    const done = checklist.items.filter(i => i.done).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return (
      <div className="flex items-center gap-3 text-xs text-zinc-500 font-bold">
        <span className="w-8 tabular-nums">{pct}%</span>
        <div className="h-2 flex-1 bg-zinc-100 rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : "bg-sky-500")} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="-m-4 md:-m-8 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] overflow-hidden bg-zinc-100 dark:bg-zinc-950 flex flex-col">
      <div className="flex-none h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between px-3 md:px-5">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => setShowSwitcher(prev => !prev)} className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100">
            <Layout className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Boards</span>
            <ChevronDown className="h-3.5 w-3.5 ml-0.5 md:ml-1 opacity-50" />
          </button>
          <div className="relative">
            <button onClick={() => setShowCreateMenu(p => !p)} className="h-8 w-8 rounded-lg bg-[#c91f41] flex items-center justify-center text-white shadow-[0_6px_15px_-3px_rgba(0,0,0,0.4)] hover:bg-[#a01832] transition-colors">
              <Plus className="h-4 w-4 stroke-[3]" />
            </button>
            {showCreateMenu && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl z-50 p-1.5">
                <button onClick={() => { setShowCreateBoard(true); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5">
                  <ListIcon className="h-4 w-4 text-zinc-400" /> Create Board
                </button>
                <button onClick={() => { setShowCreateWs(true); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5">
                  <Users className="h-4 w-4 text-zinc-400" /> Create Workspace
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input 
              placeholder="Search cards..."
              value={cardSearch}
              onChange={e => setCardSearch(e.target.value)}
              className="h-8 w-44 pl-8 pr-3 rounded-lg border border-zinc-200 dark:border-white/10 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#c91f41]"
            />
          </div>
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black text-white uppercase border-2 border-white shadow-sm shrink-0", getUserColor(currentUser.id, currentUser.name))}>
            {initials(currentUser.name)}
          </div>
        </div>
      </div>

      {activeBoard && (
        <div className="flex-none h-14 md:h-16 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 flex items-center justify-between px-3 md:px-5">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <span className="hidden sm:inline text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] truncate max-w-[140px]" title={activeBoard.workspaceName}>{activeBoard.workspaceName}</span>
            <div className="hidden sm:block h-6 w-[2px] bg-zinc-200 dark:bg-white/10 mx-2 shrink-0" />
            
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100/80 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0">
               {activeBoard.visibility === "PRIVATE" ? <Lock className="h-3 w-3" /> : activeBoard.visibility === "PUBLIC" ? <Globe className="h-3 w-3" /> : <Users className="h-3 w-3" />}
               {activeBoard.visibility}
            </div>
            
            <div className="hidden md:block h-6 w-px bg-zinc-200 dark:bg-white/10 mx-1 shrink-0" />
            
            <h1 className="text-base md:text-xl font-black tracking-tight text-zinc-800 dark:text-white truncate min-w-0" title={activeBoard.title}>{activeBoard.title}</h1>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Team</span>
              <AvatarPile ids={activeBoard.memberIds} size="h-9 w-9" max={6} />
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setMemberSearchContext("BOARD");
                setIsMemberSearchOpen(true);
              }}
              className="popup-trigger h-9 md:h-10 px-3 md:px-5 flex items-center gap-2 rounded-xl bg-[#c91f41] text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4)] hover:bg-[#a01832] hover:-translate-y-0.5 transition-all"
            >
              <UserPlus className="h-4 w-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Invite</span>
            </button>

            <div className="h-8 w-px bg-zinc-200 dark:bg-white/10" />
            
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowBoardMenu(!showBoardMenu); }}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-500 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              {showBoardMenu && (
                <div className="popup-content absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl z-50 p-1.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowBoardMenu(false); setShowBoardSettings(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                  >
                    <Settings className="h-4 w-4 text-zinc-400" />
                    Board Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showBoardSettings && activeBoard && (
        <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowBoardSettings(false)}>
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-zinc-800 dark:text-white">Board Settings</h3>
              <button onClick={() => setShowBoardSettings(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Board Visibility</label>
                <div className="flex gap-2">
                  {(["PRIVATE", "WORKSPACE", "PUBLIC"] as const).map(v => (
                    <button
                      key={v}
                      onClick={async () => {
                        const dbId = Number(activeBoard.id.replace("b-", ""));
                        try {
                          await updateBoardVisibility(dbId, v);
                          setBoards(prev => prev.map(b => b.id === activeBoard.id ? { ...b, visibility: v } : b));
                        } catch (err: any) { alert(err.message || "Failed to update visibility"); }
                      }}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        activeBoard.visibility === v
                          ? "bg-[#c91f41] text-white border-[#c91f41]"
                          : "bg-zinc-50 dark:bg-white/5 text-zinc-500 border-zinc-200 dark:border-white/10 hover:border-[#c91f41]"
                      )}
                    >
                      {v === "PRIVATE" && <Lock className="h-3 w-3 inline mr-1" />}
                      {v === "WORKSPACE" && <Users className="h-3 w-3 inline mr-1" />}
                      {v === "PUBLIC" && <Globe className="h-3 w-3 inline mr-1" />}
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Board Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {BOARD_COLORS.map(c => (
                    <button
                      key={c.bg}
                      title={c.name}
                      onClick={async () => {
                        const dbId = Number(activeBoard.id.replace("b-", ""));
                        try {
                          await updateBoardBackground(dbId, c.bg);
                          setBoards(prev => prev.map(b => b.id === activeBoard.id ? { ...b, background: c.bg } : b));
                          setWorkspaces(prev => prev.map(ws => ({
                            ...ws,
                            boards: ws.boards.map((b: any) => b.id === dbId ? { ...b, background: c.bg } : b)
                          })));
                        } catch (err: any) { alert(err.message || "Failed to update color"); }
                      }}
                      className={cn(
                        "h-10 w-full rounded-xl transition-all border-2",
                        c.bg,
                        activeBoard.background === c.bg ? "border-white ring-2 ring-zinc-400 scale-110" : "border-transparent hover:scale-105"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="h-px bg-zinc-100 dark:bg-white/10" />
              <button
                onClick={async () => {
                  const dbId = Number(activeBoard.id.replace("b-", ""));
                  if (!confirm(`Delete board "${activeBoard.title}"? This cannot be undone.`)) return;
                  try {
                    await deleteBoard(dbId);
                    setWorkspaces(prev => prev.map(ws => ({ ...ws, boards: ws.boards.filter((b: any) => b.id !== dbId) })));
                    setShowBoardSettings(false);
                  } catch (err: any) { alert(err.message || "Failed to delete board"); }
                }}
                className="w-full py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all"
              >
                Delete Board
              </button>
            </div>
          </div>
        </div>
      )}

      {!activeBoardId ? (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-850 dark:to-zinc-800">
          <div className="text-center max-w-sm">
            <div className="h-16 w-16 rounded-3xl bg-[#fce4ec] flex items-center justify-center text-[#c91f41] mx-auto mb-6">
              <Layout className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-2">Welcome to Boards</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 font-medium">Create a workspace and board to start organizing tasks with your team.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCreateWs(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 text-xs font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
              >
                <Users className="h-4 w-4" />
                Create Workspace
              </button>
              <button
                onClick={() => setShowCreateBoard(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#c91f41] text-white text-xs font-black uppercase tracking-widest hover:bg-[#a01832] shadow-[0_6px_15px_-3px_rgba(0,0,0,0.4)] transition-colors"
              >
                <Layout className="h-4 w-4" />
                Create Board
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="flex-1 overflow-x-auto p-5 bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-850 dark:to-zinc-800">
        <div className="flex gap-4 items-start min-w-max h-full">
          {filteredLists.map((list, lIdx) => (
            <div 
              key={list.id} 
              onDragOver={(e) => { if (draggedListId) { onDragOver(e, list.id, lIdx); } else if (draggedCard) { e.preventDefault(); } }}
              onDrop={(e) => { if (draggedListId) onDrop(e, list.id, lIdx); }}
              className={cn(
                "w-[272px] max-h-full flex flex-col bg-zinc-100/80 dark:bg-zinc-900 rounded-2xl border border-zinc-300 dark:border-zinc-700 shadow-md shadow-zinc-200/50 dark:shadow-zinc-950/50 transition-transform duration-200",
                draggedListId === list.id && "opacity-40 rotate-1 scale-95",
                dropIndicator?.listId === list.id && draggedListId && "ring-2 ring-[#c91f41] ring-offset-2"
              )}
            >
              <header className="flex-none p-4 flex items-center justify-between group">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {list.restricted && <span title="This list is restricted"><Lock className="h-3 w-3 text-amber-500 shrink-0" /></span>}
                  <textarea 
                    defaultValue={list.title}
                    rows={1}
                    className="bg-transparent text-sm font-black text-zinc-700 dark:text-zinc-200 outline-none focus:bg-white dark:focus:bg-white/5 px-1.5 py-0.5 rounded transition-all cursor-text min-w-0 flex-1 resize-none overflow-hidden leading-snug"
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = t.scrollHeight + 'px';
                    }}
                    onBlur={async (e) => {
                      const newTitle = e.currentTarget.value.trim();
                      if (newTitle && newTitle !== list.title) {
                        const listDbId = Number(list.id.replace("l-", ""));
                        try {
                          await renameList(listDbId, newTitle);
                          setListsByBoard(prev => {
                            const boardIdStr = activeBoard?.id;
                            if (!boardIdStr) return prev;
                            const lists = prev[boardIdStr] || [];
                            return { ...prev, [boardIdStr]: lists.map((l: any) => l.id === list.id ? { ...l, title: newTitle } : l) };
                          });
                        } catch (err: any) { alert(err.message || "Failed to rename list"); }
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <div
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); onDragStartList(e, list.id); }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveListMenuId(activeListMenuId === list.id ? null : list.id); }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {activeListMenuId === list.id && (
                    <div className="popup-content absolute top-full right-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl z-50 p-1.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleListRestriction(list.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                      >
                        <Lock className="h-3.5 w-3.5 text-zinc-400" />
                        {list.restricted ? "Unrestrict List" : "Restrict List"}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete List
                      </button>
                    </div>
                  )}
                </div>
                </div>
              </header>
              <div 
                className="flex-1 overflow-y-auto px-2 space-y-2 pb-2 min-h-[32px]"
                onDragOver={(e) => onDragOver(e, list.id, list.cards.length)}
                onDrop={(e) => onDrop(e, list.id, list.cards.length)}
              >
                {list.cards.map((card, cIdx) => (
                  <div 
                    key={card.id}
                    draggable
                    onDragStart={(e) => onDragStartCard(e, list.id, card.id)}
                    onDragOver={(e) => onDragOver(e, list.id, cIdx)}
                    onClick={() => setActiveCardRange({ listId: list.id, cardId: card.id })}
                    className={cn(
                      "group/card bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all cursor-pointer relative hover:-translate-y-0.5 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2",
                      draggedCard?.cardId === card.id && "bg-zinc-50 dark:bg-zinc-900 border-dashed border-zinc-300 rotate-2 opacity-50 scale-105"
                    )}
                  >
                    {card.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {card.labels.map(l => (
                          <div key={l.id} className={cn("h-1.5 w-10 rounded-full", l.color)} title={l.name} />
                        ))}
                      </div>
                    )}
                    <div className="flex items-start mb-3 min-w-0">
                      <div 
                        onClick={(e) => { e.stopPropagation(); toggleCardCompletion(list.id, card.id); }}
                        className={cn(
                          "h-5 w-5 rounded-full border-[1.5px] shrink-0 flex items-center justify-center transition-all duration-300 cursor-pointer",
                          card.isCompleted 
                            ? "bg-emerald-500 border-emerald-500 text-white mr-2 opacity-100 w-5" 
                            : "opacity-0 w-0 overflow-hidden group-hover/card:opacity-100 group-hover/card:w-5 group-hover/card:mr-2 border-zinc-400 hover:border-emerald-500 hover:bg-emerald-50 bg-transparent text-emerald-500"
                        )}
                      >
                        {card.isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          "text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-snug transition-all duration-300 break-words whitespace-normal",
                          card.isCompleted && "line-through text-zinc-400 decoration-zinc-400 decoration-2 opacity-75"
                        )}>
                          {card.title}
                        </h4>
                        {cardWarningId === card.id && (
                          <p className="text-[9px] text-red-500 font-bold mt-1 animate-bounce">
                            ⚠️ Complete checklists first!
                          </p>
                        )}
                      </div>
                    </div>
                    {card.task && (
                      <div className="mb-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                          card.task.status === "DONE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          card.task.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          card.task.status === "ASSIGNED" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          card.task.status === "SUBMITTED" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                          "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        )}>
                          {card.task.status === "DONE" ? "Done" :
                           card.task.status === "IN_PROGRESS" ? "In Progress" :
                           card.task.status === "ASSIGNED" ? "Assigned" :
                           card.task.status === "SUBMITTED" ? "Submitted" :
                           card.task.status}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      {card.dueDate && (
                        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", getDueStatus(card.dueDate, card.isCompleted))}>
                           <Clock className="h-3 w-3" />
                           <span>{formatDate(card.dueDate)}</span>
                        </div>
                      )}
                      {card.checklists.length > 0 && (
                        <div className="flex items-center gap-1">
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span className="tabular-nums">
                            {card.checklists.reduce((acc, cl) => acc + cl.items.filter(i => i.done).length, 0)}/
                            {card.checklists.reduce((acc, cl) => acc + cl.items.length, 0)}
                          </span>
                        </div>
                      )}
                      {card.memberIds.length > 0 && (
                         <div className="ml-auto">
                           <AvatarPile ids={card.memberIds} size="h-6 w-6" max={3} />
                         </div>
                      )}
                    </div>
                  </div>
                ))}
                {dropIndicator?.listId === list.id && (
                  <div className="h-10 bg-zinc-200/50 rounded-xl border-2 border-dashed border-zinc-300" />
                )}
              </div>
              <footer className="flex-none p-2 mt-auto">
                {addingCardToListId === list.id ? (
                  <div className="space-y-2 p-1">
                    <textarea
                      autoFocus
                      placeholder="Enter a title for this card..."
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddCard(list.id, newCardTitle);
                          setAddingCardToListId(null);
                          setNewCardTitle("");
                        }
                        if (e.key === "Escape") setAddingCardToListId(null);
                      }}
                      className="w-full min-h-[72px] p-3 text-sm font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 ring-sky-500/20 resize-none shadow-sm"
                    />
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => {
                          handleAddCard(list.id, newCardTitle);
                          setAddingCardToListId(null);
                          setNewCardTitle("");
                        }}
                        className="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-sky-700"
                       >
                         Add Card
                       </button>
                       <button onClick={() => setAddingCardToListId(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-white/5 text-zinc-400"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setAddingCardToListId(list.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-500 text-xs font-black uppercase tracking-wider hover:bg-zinc-200 dark:hover:bg-white/5 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    Add a card
                  </button>
                )}
              </footer>
            </div>
          ))}

          <div className="w-[240px] md:w-[272px] shrink-0">
            {addingList ? (
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-2.5 shadow-xl">
                 <input 
                  autoFocus
                  placeholder="Enter list title..."
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddList(); if (e.key === "Escape") setAddingList(false); }}
                  className="w-full h-11 px-4 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 text-sm font-bold outline-none focus:border-sky-500"
                 />
                 <div className="flex gap-2 mt-2.5">
                    <button onClick={handleAddList} className="flex-1 bg-[#c91f41] text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider hover:bg-[#a01832] shadow-[0_6px_15px_-3px_rgba(0,0,0,0.4)]">Add List</button>
                    <button onClick={() => setAddingList(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200"><X className="h-4 w-4" /></button>
                 </div>
               </div>
            ) : (
              <button 
                onClick={() => setAddingList(true)}
                className="w-full h-14 bg-[#c91f41]/5 text-[#c91f41] opacity-60 hover:opacity-100 hover:bg-[#c91f41]/10 rounded-2xl flex items-center gap-3 px-5 text-sm font-black uppercase tracking-widest transition-all"
              >
                <Plus className="h-5 w-5" />
                Add list
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {showSwitcher && (() => {
        const BOARDS_PER_PAGE = 12;
        const recentBoards = [...boards]
          .filter(b => b.lastVisitedAt > 0)
          .sort((a, b) => b.lastVisitedAt - a.lastVisitedAt)
          .slice(0, 10);

        const filteredBoardsAll = boards.filter(b => b.title.toLowerCase().includes(switcherSearch.toLowerCase()));
        const visibleBoards = filteredBoardsAll.slice(0, boardsPage * BOARDS_PER_PAGE);
        const hasMoreBoards = visibleBoards.length < filteredBoardsAll.length;

        const filteredWs = workspaces.filter(ws => ws.name.toLowerCase().includes(switcherSearch.toLowerCase()));
        const selectedWs = selectedWsId ? workspaces.find(ws => ws.id === selectedWsId) : null;
        const wsBoardsAll = selectedWs ? selectedWs.boards : [];
        const visibleWsBoards = wsBoardsAll.slice(0, wsBoardsPage * BOARDS_PER_PAGE);
        const hasMoreWsBoards = visibleWsBoards.length < wsBoardsAll.length;

        return (
        <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-md flex items-center justify-center" onClick={() => { setShowSwitcher(false); setSelectedWsId(null); }}>
          <div
            className="w-full h-full max-w-6xl max-h-[95vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 m-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-none px-10 pt-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-neutral-800 dark:text-white">Workspace Switcher</h2>
                  <div className="text-[9px] tracking-[0.25em] font-bold text-neutral-400 dark:text-zinc-500 uppercase mt-1">Quickly navigate between boards</div>
                </div>
                <button
                  onClick={() => { setShowSwitcher(false); setSelectedWsId(null); }}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/15 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-all shadow-sm"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex justify-center my-6">
                <div className="bg-zinc-100 dark:bg-neutral-800 p-0.5 rounded-full flex w-fit border border-zinc-200 dark:border-white/10">
                  {(["BOARDS", "WORKSPACES"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setSwitcherTab(tab); setSelectedWsId(null); }}
                      className={cn(
                        "px-8 py-2 rounded-full font-bold text-xs transition-all duration-300",
                        switcherTab === tab
                          ? "bg-white dark:bg-zinc-700 text-[#c91f41] dark:text-white shadow-sm"
                          : "text-[#5b4041] dark:text-zinc-400 hover:text-[#c91f41]"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative group mb-4">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#78001f] dark:text-zinc-400 h-5 w-5" />
                <input
                  autoFocus
                  placeholder={switcherTab === "BOARDS" ? "Search for boards across all workspaces..." : "Find a workspace..."}
                  className="w-full py-4 pl-14 pr-6 bg-white dark:bg-zinc-800 border border-[#e2bebe] dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-[#78001f]/20 dark:focus:ring-white/15 focus:border-[#78001f] dark:focus:border-white/20 transition-all outline-none text-lg font-medium text-[#0d1c2f] dark:text-white placeholder:text-[#8e7070] dark:placeholder:text-zinc-500"
                  value={switcherSearch}
                  onChange={e => setSwitcherSearch(e.target.value)}
                />
              </div>
            </div>

            <div ref={boardsScrollRef} className="flex-1 overflow-y-auto px-10 pb-8 custom-scrollbar">
              {switcherTab === "BOARDS" ? (
                <div className="space-y-8">
                  {recentBoards.length > 0 && !switcherSearch && (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <Clock className="h-4 w-4 text-[#5a4041] dark:text-zinc-400" />
                        <span className="text-sm font-bold text-[#0d1c2f] dark:text-white">Recently viewed</span>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {recentBoards.map(b => (
                          <button
                            key={b.id}
                            onClick={() => handleBoardSelect(b.id)}
                            className="flex-none w-[180px] rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden hover:shadow-md transition-all text-left bg-white dark:bg-zinc-800"
                          >
                            <div className={cn("h-[100px] w-full", b.background || "bg-sky-600")} />
                            <div className="px-3 py-2.5">
                              <span className="text-sm font-semibold text-[#0d1c2f] dark:text-white truncate block">{b.title}</span>
                              <span className="text-[10px] font-medium text-[#5a4041] dark:text-zinc-400 truncate block mt-0.5">{b.workspaceName}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#5a4041] dark:text-zinc-400 mb-4">All Boards</p>
                    {visibleBoards.length > 0 ? (
                      <div className="flex flex-wrap gap-4">
                        {visibleBoards.map(b => (
                          <button
                            key={b.id}
                            onClick={() => handleBoardSelect(b.id)}
                            className="w-[180px] rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden hover:shadow-md transition-all text-left bg-white dark:bg-zinc-800"
                          >
                            <div className={cn("h-[100px] w-full", b.background || "bg-sky-600")} />
                            <div className="px-3 py-2.5">
                              <span className="text-sm font-semibold text-[#0d1c2f] dark:text-white truncate block">{b.title}</span>
                              <span className="text-[10px] font-medium text-[#5a4041] dark:text-zinc-400 truncate block mt-0.5">{b.workspaceName}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#8e7070] dark:text-zinc-500 text-center py-10">No boards found.</p>
                    )}
                    {hasMoreBoards && (
                      <p className="text-center text-xs text-[#8e7070] dark:text-zinc-500 mt-4 animate-pulse">Scroll to load more...</p>
                    )}
                  </section>
                </div>
              ) : (
                <div className="space-y-10">
                  {!selectedWs ? (
                    <>
                      {recentBoards.length > 0 && !switcherSearch && (
                        <section>
                          <div className="flex items-center gap-3 mb-4">
                            <Clock className="h-4 w-4 text-[#5a4041] dark:text-zinc-400" />
                            <span className="text-sm font-bold text-[#0d1c2f] dark:text-white">Recently viewed</span>
                          </div>
                          <div className="flex gap-4 overflow-x-auto pb-2">
                            {recentBoards.map(b => (
                              <button
                                key={b.id}
                                onClick={() => handleBoardSelect(b.id)}
                                className="flex-none w-[180px] rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden hover:shadow-md transition-all text-left bg-white dark:bg-zinc-800 group"
                              >
                                <div className={cn("h-[100px] w-full", b.background || "bg-sky-600")} />
                                <div className="px-3 py-2.5">
                                  <span className="text-sm font-semibold text-[#0d1c2f] dark:text-white truncate block">{b.title}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}

                      <section>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#5a4041] dark:text-zinc-400 mb-5">Your Workspaces</p>
                        <div className="space-y-8">
                          {filteredWs.map(ws => (
                            <div key={ws.id}>
                              <div className="flex items-center gap-3 mb-3">
                                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0", getUserColor(ws.ownerId, ws.name))}>
                                  {ws.name[0]?.toUpperCase()}
                                </div>
                                <span className="text-base font-bold text-[#0d1c2f] dark:text-white truncate max-w-[200px]" title={ws.name}>{ws.name}</span>
                              </div>
                              <div className="flex flex-wrap gap-4">
                                {ws.boards.slice(0, wsBoardsPage * BOARDS_PER_PAGE).map((b: any) => (
                                  <button
                                    key={b.id}
                                    onClick={() => handleBoardSelect(`b-${b.id}`)}
                                    className="w-[180px] rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden hover:shadow-md transition-all text-left bg-white dark:bg-zinc-800 group"
                                  >
                                    <div className={cn("h-[100px] w-full", b.background || "bg-sky-600")} />
                                    <div className="px-3 py-2.5">
                                      <span className="text-sm font-semibold text-[#0d1c2f] dark:text-white truncate block">{b.title}</span>
                                    </div>
                                  </button>
                                ))}
                                <button
                                  onClick={() => { setShowCreateBoard(true); setShowSwitcher(false); }}
                                  className="w-[180px] h-[140px] rounded-xl border-2 border-dashed border-zinc-300 dark:border-white/10 flex items-center justify-center text-[#8e7070] dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                                >
                                  <span className="text-sm font-semibold">Create new board</span>
                                </button>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => { setShowCreateWs(true); setShowSwitcher(false); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-sm font-semibold text-[#5a4041] dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                            <Plus className="h-4 w-4" />
                            New Workspace
                          </button>
                        </div>
                      </section>
                    </>
                  ) : (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                      <button
                        onClick={() => setSelectedWsId(null)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#c91f41] mb-6 group"
                      >
                        <ChevronRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
                        Back to Workspaces
                      </button>

                      {selectedWs && (
                        <div className="space-y-8">
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-3xl font-black text-[#0d1c2f] dark:text-white capitalize truncate max-w-[400px]" title={selectedWs.name}>{selectedWs.name}</h2>
                              <p className="text-[#5a4041] dark:text-zinc-400 font-bold text-xs uppercase tracking-widest mt-1">{selectedWs.boards.length} Boards • {selectedWs.members.length} Members</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); setMemberSearchContext("WORKSPACE"); setIsMemberSearchOpen(true); }}
                                className="popup-trigger h-12 px-8 bg-[#0d1c2f] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:opacity-90 active:scale-95 transition-all"
                              >
                                Add Member
                              </button>
                              {(selectedWs.ownerId === currentUser.id || currentUser.role === "ADMIN") && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm(`Delete workspace "${selectedWs.name}"? This will remove all boards and data.`)) return;
                                    try {
                                      await deleteWorkspace(selectedWs.id);
                                      setWorkspaces(prev => prev.filter(ws => ws.id !== selectedWs.id));
                                      setSelectedWsId(null);
                                    } catch (err: any) { alert(err.message || "Failed to delete workspace"); }
                                  }}
                                  className="h-12 px-6 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-rose-700 active:scale-95 transition-all"
                                >
                                  Delete Workspace
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visibleWsBoards.map((b: any) => (
                              <button
                                key={b.id}
                                onClick={() => handleBoardSelect(`b-${b.id}`)}
                                className="flex flex-col items-start p-6 rounded-2xl border border-[#e2bebe] dark:border-white/10 hover:border-[#78001f] dark:hover:border-sky-500/50 hover:bg-[#eff4ff]/30 dark:hover:bg-white/5 text-left transition-all group shadow-sm bg-gradient-to-br from-red-50 via-white to-rose-50 dark:from-red-950/20 dark:via-zinc-900 dark:to-zinc-900"
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-xl font-black text-[#0d1c2f] dark:text-white group-hover:text-[#78001f] dark:group-hover:text-sky-400 transition-colors">{b.title}</span>
                                  <ChevronRight className="h-5 w-5 text-[#c91f41] opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                </div>
                              </button>
                            ))}
                            <button onClick={() => { setShowCreateBoard(true); setShowSwitcher(false); }} className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[#e2bebe] dark:border-white/10 text-[#8e7070] dark:text-zinc-400 hover:bg-[#eff3ff] dark:hover:bg-white/5 transition-all gap-2">
                              <Plus className="h-6 w-6" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Create New Board</span>
                            </button>
                          </div>
                          {hasMoreWsBoards && (
                            <p className="text-center text-xs text-[#8e7070] dark:text-zinc-500 animate-pulse">Scroll to load more...</p>
                          )}

                          <section>
                            <div className="flex items-center gap-4 mb-5">
                              <span className="text-[10px] font-black tracking-[0.2em] text-[#5a4041] dark:text-zinc-400 uppercase">Workspace Members</span>
                              <div className="h-[1px] flex-1 bg-[#e2bebe]/30 dark:bg-white/10" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {selectedWs.members.map((m: any) => {
                                const uObj = m.user || m;
                                const uId = uObj.id || m.userId;
                                return (
                                  <div key={m.id || uId} className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-[#e2bebe] dark:border-white/10 shadow-sm">
                                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm shrink-0", getUserColor(uId, uObj.name))}>{initials(uObj.name)}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-black truncate text-[#0d1c2f] dark:text-white">{uObj.name}</p>
                                      <p className="text-[10px] font-bold text-[#5a4041] dark:text-zinc-400 truncate uppercase tracking-tight">{uObj.email}</p>
                                    </div>
                                  </div>
                                );
                              })}
                              <button
                                onClick={(e) => { e.stopPropagation(); setMemberSearchContext("WORKSPACE"); setIsMemberSearchOpen(true); }}
                                className="popup-trigger flex items-center justify-center p-4 border-2 border-dashed border-[#e2bebe] dark:border-white/10 rounded-2xl text-[#8e7070] dark:text-zinc-400 hover:bg-[#eff3ff] dark:hover:bg-white/5 transition-all gap-2 group"
                              >
                                <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Invite</span>
                              </button>
                            </div>
                          </section>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {activeCard && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-12" onClick={() => setActiveCardRange(null)}>
          <div 
            className="w-full max-w-4xl max-h-[85vh] bg-[#f4f5f7] dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-10 pt-10 pb-6 flex items-start justify-between">
               <div className="flex-1">
                 <div className="flex items-center gap-3 mb-2">
                    <Hash className="h-5 w-5 text-zinc-400" />
                    <input 
                      defaultValue={activeCard.card.title}
                      onBlur={async (e) => {
                        const val = e.target.value.trim();
                        if (val && val !== activeCard.card.title) {
                          const cardDbId = Number(activeCardRange!.cardId.replace("c-", ""));
                          try { await updateCardTitle(cardDbId, val); } catch (err) { console.error(err); }
                          updateActiveCard(c => ({ ...c, title: val }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                       className="text-xl md:text-2xl font-black text-zinc-800 dark:text-white bg-transparent outline-none focus:bg-white dark:focus:bg-white/5 rounded-xl px-3 py-1 -ml-3 w-full"
                    />
                 </div>
                 <p className="text-zinc-500 text-sm font-bold ml-8 uppercase tracking-widest text-[10px]">
                    In list <span className="underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4 decoration-2">{activeCard.list.title}</span>
                 </p>
               </div>
               <button onClick={() => setActiveCardRange(null)} className="h-12 w-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-800 transition-all shadow-sm"><X className="h-6 w-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 px-4 md:px-10 pb-8 md:pb-12">
              <div className="flex-1 space-y-6 md:space-y-10">
                <div className="flex flex-wrap gap-6 md:gap-10">
                   <div>
                     <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-3">Members</h3>
                     <div className="flex items-center gap-2">
                       {activeCard.card.memberIds.length > 0 ? (
                         <AvatarPile ids={activeCard.card.memberIds} size="h-9 w-9" />
                       ) : (
                         <div className="h-9 w-9 rounded-full border-2 border-dashed border-zinc-200 dark:border-white/5 flex items-center justify-center text-zinc-300">
                           <Users className="h-4 w-4" />
                         </div>
                       )}
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMemberSearchContext("CARD");
                          setIsMemberSearchOpen(true);
                        }} 
                        className="popup-trigger h-9 w-9 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors shadow-sm"
                       >
                        <Plus className="h-4 w-4" />
                       </button>
                      </div>
                   </div>

                   <div>
                      <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-3">Assigned To</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeCard.card.assignedToUserId ? (
                          (() => {
                            const aId = `u-${activeCard.card.assignedToUserId}`;
                            const a = members.find(m => m.id === aId);
                            return (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-full">
                                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[8px] font-black text-white", getUserColor(activeCard.card.assignedToUserId!, a?.name || ''))}>
                                  {initials(a?.name || "?")}
                                </div>
                                <span className="text-xs font-bold text-sky-700 dark:text-sky-300">{a?.name || "Unknown"}</span>
                                <button
                                  onClick={async () => {
                                    const cardDbId = Number(activeCardRange!.cardId.replace("c-", ""));
                                    updateActiveCard(c => ({ ...c, assignedToUserId: null }));
                                    try { await setCardAssignee(cardDbId, null); } catch (err) { console.error(err); updateActiveCard(c => ({ ...c, assignedToUserId: activeCard.card.assignedToUserId })); alert("Failed to save. Make sure the dev server has been restarted after schema changes."); }
                                  }}
                                  className="h-4 w-4 rounded-full hover:bg-sky-200 dark:hover:bg-sky-500/30 flex items-center justify-center text-sky-400 hover:text-sky-600 transition-all"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-400 italic">No one assigned</span>
                        )}
                        {activeCard.card.memberIds.length > 0 && (
                          <div className="relative" id="assignee-picker">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const el = document.getElementById('assignee-picker-dropdown');
                                if (el) el.classList.toggle('hidden');
                              }}
                              className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors text-xs font-bold"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </button>
                            <div id="assignee-picker-dropdown" className="hidden absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl shadow-xl z-50 p-2 min-w-[160px]">
                              {activeCard.card.memberIds.map(mId => {
                                const m = members.find(u => u.id === mId);
                                const isAssigned = activeCard.card.assignedToUserId === Number(mId.replace('u-', ''));
                                return (
                                  <button
                                    key={mId}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const cardDbId = Number(activeCardRange!.cardId.replace("c-", ""));
                                      const uid = Number(mId.replace('u-', ''));
                                      const prevAssigned = activeCard.card.assignedToUserId;
                                      updateActiveCard(c => ({ ...c, assignedToUserId: uid }));
                                      document.getElementById('assignee-picker-dropdown')?.classList.add('hidden');
                                      try { await setCardAssignee(cardDbId, uid); } catch (err) { console.error(err); updateActiveCard(c => ({ ...c, assignedToUserId: prevAssigned })); alert("Failed to save. Make sure the dev server has been restarted after schema changes."); }
                                    }}
                                    className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all", isAssigned ? "bg-sky-50 text-sky-600" : "hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300")}
                                  >
                                    <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[7px] font-black text-white", getUserColor(Number(mId.replace('u-', '')), m?.name || ''))}>
                                      {initials(m?.name || "?")}
                                    </div>
                                    {m?.name}
                                    {isAssigned && <Check className="h-3 w-3 ml-auto text-sky-500" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                   </div>

                   <div>
                      <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-3">Labels</h3>
                      <div className="flex flex-wrap gap-2">
                         {activeCard.card.labels.map(l => (
                             <div key={l.id} className={cn("group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide text-white", l.color)}>
                              {l.name}
                              <button
                                onClick={async () => {
                                  const labelDbId = Number(l.id.replace("lb-", ""));
                                  try { await removeCardLabel(labelDbId); } catch (err) { console.error(err); }
                                  updateActiveCard(c => ({ ...c, labels: c.labels.filter(lbl => lbl.id !== l.id) }));
                                }}
                                className="h-3.5 w-3.5 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/40 transition-all"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            </div>
                         ))}
                         {activeCard.card.labels.length === 0 && (
                            <div className="px-4 py-2 rounded-xl border-2 border-dashed border-zinc-200 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-300">No labels</div>
                         )}
                         <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsLabelEditorOpen(true);
                          }} 
                          className="popup-trigger h-9 w-9 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-all shadow-sm"
                         >
                          <Plus className="h-4 w-4" />
                         </button>
                      </div>
                   </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AlignLeft className="h-5 w-5 text-zinc-400" />
                      <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-700 dark:text-zinc-300">Description</h3>
                    </div>
                    {activeCard.card.description && !isDescriptionEditing && (
                      <button onClick={() => { setDescriptionValue(activeCard.card.description || ""); setIsDescriptionEditing(true); }} className="px-3 py-1.5 rounded-lg bg-zinc-200/50 hover:bg-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500 transition-all">Edit</button>
                    )}
                  </div>
                  <div className="ml-8">
                     {isDescriptionEditing || !activeCard.card.description ? (
                       <div className="space-y-3">
                         <RichTextEditor
                            value={descriptionValue}
                            onChange={setDescriptionValue}
                            placeholder="Add a more detailed description..."
                            height={150}
                         />
                         <div className="flex gap-2">
                           <button 
                             onClick={async () => {
                               const val = descriptionValue.trim();
                               const cardDbId = Number(activeCardRange!.cardId.replace("c-", ""));
                               try { await updateCardDescription(cardDbId, val); } catch (err) { console.error(err); }
                               updateActiveCard(c => ({ ...c, description: val }));
                               setIsDescriptionEditing(false);
                             }}
                             className="bg-[#c91f41] text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#a01832] shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
                           >
                             Save
                           </button>
                           <button onClick={() => setIsDescriptionEditing(false)} className="text-zinc-500 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-zinc-200 transition-all">Cancel</button>
                         </div>
                       </div>
                     ) : (
                       <div className="p-4 bg-white/50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5 cursor-pointer group hover:border-zinc-300 transition-all" onClick={() => { setDescriptionValue(activeCard.card.description || ""); setIsDescriptionEditing(true); }}>
                          <MarkdownRenderer content={activeCard.card.description || ""} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
                       </div>
                     )}
                  </div>
                </div>

                {activeCard.card.dueDate && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="h-5 w-5 text-zinc-400" />
                      <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-700 dark:text-zinc-300">Due Date</h3>
                    </div>
                    <div className="ml-8">
                       <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm", getDueStatus(activeCard.card.dueDate, activeCard.card.isCompleted))}>
                          {formatDate(activeCard.card.dueDate)}
                          {activeCard.card.isCompleted ? "(Completed)" : ""}
                       </div>
                    </div>
                  </div>
                )}

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-5 w-5 text-zinc-400" />
                      <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-700 dark:text-zinc-300">Attachments</h3>
                    </div>
                  </div>
                  <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeCard.card.attachments.map(att => (
                      <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 rounded-2xl group hover:border-sky-500 transition-all shadow-sm">
                        <div className="h-10 w-10 flex-none rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200 truncate">{att.name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{formatDate(att.createdAt)}</p>
                        </div>
                        <button 
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const attDbId = Number(att.id.replace("at-", ""));
                            try {
                              await deleteCardAttachment(attDbId);
                              updateActiveCard(c => ({ ...c, attachments: c.attachments.filter(a => a.id !== att.id) }));
                            } catch (err: any) {
                              alert(err.message || "Failed to delete attachment");
                            }
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </a>
                    ))}
                    {activeCard.card.attachments.length === 0 && (
                      <div 
                        onClick={() => setIsAddingFile(true)}
                        className="col-span-full py-8 border-2 border-dashed border-zinc-200 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center text-zinc-400 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
                      >
                         <Paperclip className="h-8 w-8 mb-2 opacity-20" />
                         <p className="text-[10px] font-black uppercase tracking-widest">No attachments yet. Click to add.</p>
                      </div>
                    )}
                  </div>
                </div>

                {activeCard.card.checklists.map(cl => (
                  <div key={cl.id}>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="h-5 w-5 text-zinc-400" />
                        <input
                          defaultValue={cl.title}
                          onBlur={async (e) => {
                            const newTitle = e.currentTarget.value.trim();
                            if (newTitle && newTitle !== cl.title) {
                              const clDbId = Number(cl.id.replace("cl-", ""));
                              try {
                                await renameChecklist(clDbId, newTitle);
                                updateActiveCard(c => ({
                                  ...c,
                                  checklists: c.checklists.map(cList => cList.id === cl.id ? { ...cList, title: newTitle } : cList)
                                }));
                              } catch (err: any) { alert(err.message || "Failed to rename checklist"); }
                            }
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                          className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-700 dark:text-zinc-300 bg-transparent outline-none focus:bg-white dark:focus:bg-white/5 px-1.5 py-0.5 rounded transition-all cursor-text"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          const clDbId = Number(cl.id.replace("cl-", ""));
                          if (!confirm(`Delete checklist "${cl.title}"?`)) return;
                          try {
                            await deleteChecklist(clDbId);
                            updateActiveCard(c => ({
                              ...c,
                              checklists: c.checklists.filter(cList => cList.id !== cl.id)
                            }));
                          } catch (err: any) { alert(err.message || "Failed to delete checklist"); }
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-rose-500"
                      >Delete</button>
                    </div>
                    <div className="ml-8 space-y-6">
                       <ChecklistProgress checklist={cl} />
                       <div className="space-y-3">
                          {cl.items.map(it => (
                            <div key={it.id} className="flex items-start gap-4 group">
                                <button 
                                 onClick={async () => {
                                   if (it.assignedMemberId && it.assignedMemberId !== selfMemberId) {
                                     setCardDetailWarning("Only the assigned person can mark this item!");
                                     return;
                                   }
                                   const itemDbId = Number(it.id.replace("ci-", ""));
                                   try { await toggleChecklistItem(itemDbId); } catch (err: any) { setCardDetailWarning(err.message || "Failed to update item"); return; }
                                  updateActiveCard(c => ({
                                    ...c,
                                    checklists: c.checklists.map(cList => cList.id === cl.id ? {
                                      ...cList,
                                      items: cList.items.map(item => item.id === it.id ? { ...item, done: !item.done } : item)
                                    } : cList)
                                  }));
                                }}
                                className={cn("h-6 w-6 shrink-0 rounded-lg border-2 border-zinc-200 flex items-center justify-center transition-all", it.done ? "bg-emerald-500 border-emerald-500 text-white" : (it.assignedMemberId && it.assignedMemberId !== selfMemberId) ? "bg-zinc-100 border-zinc-200 text-zinc-300 cursor-not-allowed" : "bg-white hover:border-zinc-400")}
                              >
                                {it.done && <Check className="h-4 w-4 stroke-[3]" />}
                              </button>
                              <div className="flex-1">
                                <p className={cn("text-sm font-semibold mt-0.5", it.done ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300")}>{it.title}</p>
                                {it.assignedMemberId && (
                                   <div className="flex items-center gap-1.5 mt-1.5">
                                      <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-black text-white", getUserColor(Number(it.assignedMemberId.replace('u-', '')), members.find(m => m.id === it.assignedMemberId)?.name || ''))}>
                                        {initials(members.find(m => m.id === it.assignedMemberId)?.name || "?")}
                                      </div>
                                      <span className="text-[10px] font-bold text-zinc-400 italic">assigned to {members.find(m => m.id === it.assignedMemberId)?.name}</span>
                                   </div>
                                )}
                              </div>
                              <button 
                                onClick={() => {
                                  updateActiveCard(c => ({
                                    ...c,
                                    checklists: c.checklists.map(cList => cList.id === cl.id ? {
                                      ...cList,
                                      items: cList.items.filter(item => item.id !== it.id)
                                    } : cList)
                                  }));
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X className="h-4 w-4" />
                              </button>
                           </div>
                         ))}
                         
                         <div className="pt-2">
                               <input 
                                 placeholder="Add item... (defaults to you)"
                                 className="w-full h-10 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-sky-500/10 placeholder:text-zinc-400"
                               onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    const val = e.currentTarget.value.trim();
                                    if (val) {
                                      const clDbId = Number(cl.id.replace("cl-", ""));
                                      const assigneeId = checklistAssigneeId ? Number(checklistAssigneeId.replace("u-", "")) : currentUser.id;
                                      addChecklistItem(clDbId, val, assigneeId).then((item) => {
                                        updateActiveCard(c => ({
                                          ...c,
                                          checklists: c.checklists.map(cList => cList.id === cl.id ? {
                                            ...cList,
                                            items: [...cList.items, { 
                                              id: `ci-${item.id}`, 
                                              title: val, 
                                              done: false,
                                              assignedMemberId: checklistAssigneeId || selfMemberId
                                            }]
                                          } : cList)
                                        }));
                                      }).catch(err => console.error(err));
                                      e.currentTarget.value = "";
                                      setChecklistAssigneeId(null);
                                    }
                                  }
                               }}
                            />
                           
                           {/* Member assignment for checklist items */}
                           <div className="mt-3 flex flex-wrap gap-2 items-center">
                              <span className="text-[10px] font-black uppercase text-zinc-400 mr-2">Assign to:</span>
                              {activeCard.card.memberIds.map(mId => {
                                const m = members.find(u => u.id === mId);
                                const isSelected = checklistAssigneeId === mId;
                                return (
                                  <button 
                                    key={mId}
                                    title={m?.name}
                                    onClick={() => setChecklistAssigneeId(isSelected ? null : mId)}
                                    className={cn(
                                      "h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center text-[8px] font-black text-white hover:scale-110", 
                                      getUserColor(Number(mId.replace('u-', '')), m?.name || ''),
                                      isSelected ? "border-sky-500 ring-2 ring-sky-500/20 shadow-md scale-110" : "border-white"
                                    )}
                                  >
                                    {initials(m?.name || "?")}
                                  </button>
                                );
                              })}
                              {activeCard.card.memberIds.length === 0 && (
                                <span className="text-[9px] font-bold text-zinc-400 italic">No members to assign</span>
                              )}
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                ))}

                <div className="flex flex-col min-h-0">
                   <div className="flex items-center gap-3 mb-6 flex-none">
                    <ListIcon className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-700 dark:text-zinc-300">Activity</h3>
                   </div>
                   <div className="ml-8 flex flex-col min-h-0 flex-1">
                     <div className="flex gap-4 flex-none mb-6">
                        <div className={cn("h-9 w-9 flex-none rounded-full flex items-center justify-center text-[10px] font-black text-white uppercase shadow-sm", getUserColor(currentUser.id, currentUser.name))}>{initials(currentUser.name)}</div>
                        <div className="flex-1 space-y-3">
                           <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 rounded-2xl shadow-inner focus-within:border-sky-500 transition-all">
                              <RichTextEditor
                                value={activeComment}
                                onChange={setActiveComment}
                                placeholder="Write a comment..."
                                height={100}
                                compact
                              />
                           </div>
                           {activeComment && activeComment.trim() && (
                             <button 
                                onClick={handleAddComment}
                                className="h-8 px-4 bg-[#c91f41] text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 animate-in fade-in slide-in-from-top-1 hover:bg-[#a01832] transition-colors"
                             >
                               Save Comment
                             </button>
                           )}
                        </div>
                     </div>
                     <div className="flex-1 overflow-y-auto min-h-0 max-h-[280px] space-y-6 relative border-l-2 border-zinc-100 dark:border-white/5 pl-8 py-2 pr-2">
                       {activeCard.card.activity.map(act => (
                          <div key={act.id} className="flex gap-4 relative group">
                             <div className="absolute -left-[42px] top-2 h-5 w-5 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-white/10 flex items-center justify-center z-10">
                                {act.type === "SYSTEM" ? <Settings className="h-2.5 w-2.5 text-zinc-400" /> : <MessageSquare className="h-2.5 w-2.5 text-zinc-400" />}
                             </div>
                             <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                   <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{act.actor}</span>
                                   <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                                      {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                                   </span>
                                </div>
                                <div className={cn(
                                  "text-sm font-bold p-3 rounded-2xl border transition-all",
                                  act.type === "SYSTEM" 
                                    ? "bg-zinc-50/50 dark:bg-white/5 border-transparent text-zinc-400 italic" 
                                    : "bg-white dark:bg-white/5 border-zinc-100 dark:border-white/10 text-zinc-700 dark:text-zinc-300 group-hover:border-zinc-200"
                                )}>
                                   {act.type === "SYSTEM" ? act.message : <MarkdownRenderer content={act.message} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />}
                                </div>
                             </div>
                          </div>
                       ))}
                     </div>
                   </div>
                </div>
              </div>

              <div className="w-full md:w-[180px] space-y-6 md:space-y-10">
                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Add to card</h4>
                  <div className="space-y-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberSearchContext("CARD");
                        setIsMemberSearchOpen(true);
                      }}
                      className="popup-trigger w-full h-9 flex items-center gap-2.5 px-3 rounded-xl bg-zinc-200/60 hover:bg-zinc-200 text-zinc-600 transition-all font-bold text-xs"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Members
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLabelEditorOpen(true);
                      }}
                      className="popup-trigger w-full h-9 flex items-center gap-2.5 px-3 rounded-xl bg-zinc-200/60 hover:bg-zinc-200 text-zinc-600 transition-all font-bold text-xs"
                    >
                      <Hash className="h-3.5 w-3.5" />
                      Labels
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsChecklistAddOpen(true);
                      }}
                      className="popup-trigger w-full h-9 flex items-center gap-2.5 px-3 rounded-xl bg-zinc-200/60 hover:bg-zinc-200 text-zinc-600 transition-all font-bold text-xs"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Checklist
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDateSelectionOpen(true);
                      }}
                      className="popup-trigger w-full h-9 flex items-center gap-2.5 px-3 rounded-xl bg-zinc-200/60 hover:bg-zinc-200 text-zinc-600 transition-all font-bold text-xs"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Dates
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAddingFile(true);
                      }}
                      className="popup-trigger w-full h-9 flex items-center gap-2.5 px-3 rounded-xl bg-zinc-200/60 hover:bg-zinc-200 text-zinc-600 transition-all font-bold text-xs"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Attachment
                    </button>
                  </div>
                </section>
                <section>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Actions</h4>
                   <div className="space-y-2">
                      <button 
                        onClick={async () => {
                          if (activeCardRange && activeBoardId) {
                            if (!activeCard.card.isCompleted) {
                              if (!activeCard.card.assignedToUserId) {
                                setCardDetailWarning("Assign someone to this card first!");
                                return;
                              }
                              if (activeCard.card.assignedToUserId !== currentUser.id) {
                                setCardDetailWarning("Only the assigned member can mark this card as done!");
                                return;
                              }
                              if (!canMarkCardComplete(activeCard.card)) {
                                setCardDetailWarning("Complete all checklist items first!");
                                return;
                              }
                            }
                            try {
                              await toggleCardCompletion(activeCardRange.listId, activeCardRange.cardId);
                            } catch (err: any) {
                              setCardDetailWarning(err.message || "Failed to complete card");
                            }
                          }
                        }}
                        className={cn("w-full h-9 flex items-center gap-2.5 px-3 rounded-xl transition-all font-bold text-xs", activeCard.card.isCompleted ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-zinc-200/60 hover:bg-zinc-200 text-zinc-600")}
                      >
                        {activeCard.card.isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        {activeCard.card.isCompleted ? "Completed" : "Mark Complete"}
                      </button>
                      {cardDetailWarning && (
                        <p className="text-[9px] text-red-500 font-bold px-3 animate-bounce">{cardDetailWarning}</p>
                      )}
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-200/60">
                        <div className="flex items-center gap-2.5">
                          <BookOpen className="h-3.5 w-3.5 text-zinc-600" />
                          <span className="font-bold text-xs text-zinc-600">Include in Logs</span>
                        </div>
                        <button
                          onClick={async () => {
                            const cardDbId = Number(activeCardRange!.cardId.replace("c-", ""));
                            const newVal = !activeCard.card.includeInLogs;
                            updateActiveCard(c => ({ ...c, includeInLogs: newVal }));
                            try { await setIncludeInLogs(cardDbId, newVal); } catch (err) { console.error(err); updateActiveCard(c => ({ ...c, includeInLogs: !newVal })); alert("Failed to save. Make sure the dev server has been restarted after schema changes."); }
                          }}
                          className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer", activeCard.card.includeInLogs ? "bg-sky-500" : "bg-zinc-300")}
                        >
                          <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200", activeCard.card.includeInLogs ? "translate-x-[18px]" : "translate-x-[2px]")} />
                        </button>
                      </div>
                      <button 
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this card?")) {
                            if (activeCardRange) {
                              const cardDbId = Number(activeCardRange.cardId.replace("c-", ""));
                              try { await deleteCard(cardDbId); } catch (e: any) { alert(e.message || "Failed to delete card"); return; }
                            }
                            setListsByBoard(prev => ({
                              ...prev,
                              [activeBoardId!]: prev[activeBoardId!].map(l => l.id === activeCardRange?.listId ? {
                                ...l,
                                cards: l.cards.filter(c => c.id !== activeCardRange?.cardId)
                              } : l)
                            }));
                            setActiveCardRange(null);
                          }
                        }}
                        className="w-full h-9 flex items-center gap-2.5 px-3 rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-200 transition-all font-bold text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                       </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Popovers */}
      {isMemberSearchOpen && (
        <div 
          className={cn(
            "popup-content fixed bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl z-[500] p-5 animate-in slide-in-from-top-2 duration-150",
            memberSearchContext === "BOARD" || memberSearchContext === "WORKSPACE" ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[320px] shadow-[0_0_100px_rgba(0,0,0,0.2)]" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[320px] shadow-[0_0_100px_rgba(0,0,0,0.2)]"
          )}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              {memberSearchContext === "BOARD" ? "Invite to Board" : memberSearchContext === "WORKSPACE" ? "Invite to Workspace" : "Assign to Card"}
            </h4>
            <button onClick={() => setIsMemberSearchOpen(false)}><X className="h-4 w-4 text-zinc-400" /></button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input 
              autoFocus
              placeholder="Search users..."
              className="w-full h-9 pl-9 pr-4 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-sky-500 shadow-inner"
              value={memberSearchQuery}
              onChange={e => setMemberSearchQuery(e.target.value)}
            />
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {(memberSearchContext === "CARD" 
                ? boardTeamMembers.length > 0 ? boardTeamMembers : systemUsers.filter(u => activeBoard?.memberIds.includes(`u-${u.id}`))
                : memberSearchContext === "BOARD" && activeBoard ? systemUsers : systemUsers
              )
              .filter(u => u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))
              .map(u => {
                const memberId = `u-${u.id}`;
                let isTargetAdded = false;
                if (memberSearchContext === "BOARD") isTargetAdded = activeBoard?.memberIds.includes(memberId) || false;
                else if (memberSearchContext === "WORKSPACE") isTargetAdded = workspaceToDisplay?.members.some(m => `u-${m.user?.id || m.userId || m.id}` === memberId) || false;
                else isTargetAdded = activeCard?.card?.memberIds?.includes(memberId) || false;

                return (
                  <button 
                    key={u.id}
                    onClick={() => {
                      if (memberSearchContext === "BOARD") {
                        handleInviteToBoard(u.id);
                      } else if (memberSearchContext === "WORKSPACE" && workspaceToDisplay) {
                        handleInviteToWorkspace(workspaceToDisplay.id, u.id);
                      } else {
                        handleInviteToCard(u.id);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all border border-transparent",
                      isTargetAdded ? "bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-900/30" : "hover:bg-zinc-50 dark:hover:bg-white/5"
                    )}
                  >
                     <div className={cn("h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-white uppercase shadow-sm", getUserColor(u.id, u.name))}>{initials(u.name)}</div>
                     <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">{u.name}</p>
                        <p className="text-[10px] font-medium text-zinc-400 truncate tracking-tight">{u.email}</p>
                     </div>
                     {isTargetAdded && <Check className="h-4 w-4 text-sky-600" />}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {isLabelEditorOpen && activeCard && (
        <div 
          className="popup-content fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[320px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl z-[350] p-5"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Labels</h4>
            <button onClick={() => { setIsLabelEditorOpen(false); setLabelEditorMode("SELECT"); }}><X className="h-4 w-4 text-zinc-400" /></button>
          </div>
          
          {labelEditorMode === "SELECT" ? (
            <div className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {BOARD_LABELS.map(l => {
                  const isAdded = activeCard.card.labels.some(lab => lab.id === l.id);
                  return (
                    <button 
                      key={l.id}
                      onClick={async () => {
                        if (!activeCardRange) return;
                        const cardDbId = Number(activeCardRange.cardId.replace("c-", ""));
                        if (isAdded) {
                          const existingLabel = activeCard.card.labels.find(lab => lab.id === l.id);
                          if (existingLabel) {
                            const labelDbId = Number(existingLabel.id.replace("lb-", ""));
                            try { await removeCardLabel(labelDbId); } catch (err) { console.error(err); }
                          }
                          updateActiveCard(c => ({ ...c, labels: c.labels.filter(lab => lab.id !== l.id) }));
                        } else {
                          try { await addCardLabel(cardDbId, l.name, l.color); } catch (err) { console.error(err); }
                          updateActiveCard(c => ({ ...c, labels: [...c.labels, l] }));
                        }
                      }}
                      className={cn("w-full h-9 rounded-lg flex items-center px-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02]", l.color)}
                    >
                      <span className="flex-1 text-left">{l.name}</span>
                      {isAdded && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setLabelEditorMode("CREATE")}
                className="w-full h-10 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
              >
                Create New Label
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Name</label>
                <input 
                  autoFocus
                  placeholder="Label name..."
                  className="w-full h-9 px-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg text-xs font-bold outline-none focus:border-sky-500"
                  value={newLabelName}
                  onChange={e => setNewLabelName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {MEMBER_COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={() => setNewLabelColor(c)}
                      className={cn("h-7 rounded-md transition-all", c, newLabelColor === c && "ring-2 ring-zinc-400 ring-offset-2 dark:ring-offset-zinc-900")}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                 <button onClick={() => setLabelEditorMode("SELECT")} className="flex-1 h-9 rounded-lg bg-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400">Back</button>
                 <button 
                  disabled={!newLabelName.trim()}
                  onClick={() => {
                    updateActiveCard(c => ({
                      ...c,
                      labels: [...c.labels, { id: createId("l"), name: newLabelName.trim(), color: newLabelColor }]
                    }));
                    setNewLabelName("");
                    setLabelEditorMode("SELECT");
                  }}
                  className="flex-1 h-9 bg-sky-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest"
                 >
                   Create
                 </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isChecklistAddOpen && activeCard && (
         <div 
          className="popup-content fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[320px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl z-[350] p-5"
          onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Add Checklist</h4>
              <button onClick={() => setIsChecklistAddOpen(false)}><X className="h-4 w-4 text-zinc-400" /></button>
            </div>
            <input 
              autoFocus
              placeholder="Checklist title..."
              className="w-full h-11 px-4 mb-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-sky-500"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const val = (e.currentTarget as HTMLInputElement).value.trim();
                  if (val && activeCardRange) {
                    const cardDbId = Number(activeCardRange.cardId.replace("c-", ""));
                    addChecklist(cardDbId, val).then((cl) => {
                      updateActiveCard(c => ({
                        ...c,
                        checklists: [...c.checklists, { id: `cl-${cl.id}`, title: val, items: [] }]
                      }));
                    }).catch(err => console.error(err));
                    setIsChecklistAddOpen(false);
                  }
                }
              }}
            />
         </div>
      )}

      {isAddingFile && activeCard && (
         <div 
          className="popup-content fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[400px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl z-[350] p-4 md:p-6 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Add File Attachment</h4>
              <button onClick={() => setIsAddingFile(false)}><X className="h-4 w-4 text-zinc-400" /></button>
            </div>
            <div className="space-y-4">
               <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">File Name</label>
                  <input value={newFileName} onChange={e => setNewFileName(e.target.value)} placeholder="Project brief.pdf" className="w-full h-11 px-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-sky-500" />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Link (URL)</label>
                  <input value={newFileUrl} onChange={e => setNewFileUrl(e.target.value)} placeholder="https://..." className="w-full h-11 px-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-sky-500" />
               </div>
               <button 
                  disabled={!newFileName.trim() || !newFileUrl.trim()}
                  onClick={async () => {
                    const cardDbId = Number(activeCard.card.id.replace("c-", ""));
                    try {
                      const att = await addCardAttachment(cardDbId, newFileName, newFileUrl);
                      updateActiveCard(c => ({
                        ...c,
                        attachments: [...c.attachments, { id: `at-${att.id}`, name: newFileName, url: newFileUrl, createdAt: new Date().toISOString() }]
                      }));
                    } catch (err: any) {
                      alert(err.message || "Failed to add attachment");
                    }
                    setNewFileName("");
                    setNewFileUrl("");
                    setIsAddingFile(false);
                  }}
                  className="w-full h-12 bg-sky-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-sky-600/30 disabled:opacity-50"
                >
                  Post Attachment
                </button>
            </div>
         </div>
      )}

      {isDateSelectionOpen && activeCard && (
         <div 
          className="popup-content fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[288px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl z-[350] p-5"
          onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Set Date</h4>
              <button onClick={() => setIsDateSelectionOpen(false)}><X className="h-4 w-4 text-zinc-400" /></button>
            </div>
            <input 
              type="date"
              className="w-full h-11 px-4 mb-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-sky-500"
              defaultValue={activeCard.card.dueDate ? new Date(activeCard.card.dueDate).toISOString().split('T')[0] : ""}
              onChange={e => {
                const val = e.target.value;
                updateActiveCard(c => ({ ...c, dueDate: val }));
              }}
            />
            <div className="flex gap-2">
              <button onClick={async () => { 
                const cardDbId = Number(activeCardRange!.cardId.replace("c-", ""));
                try { await setCardDueDate(cardDbId, activeCard!.card.dueDate || null); } catch (err) { console.error(err); }
                setIsDateSelectionOpen(false); 
              }} className="flex-1 h-9 bg-sky-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Save</button>
              <button onClick={async () => { 
                const cardDbId = Number(activeCardRange!.cardId.replace("c-", ""));
                try { await setCardDueDate(cardDbId, null); } catch (err) { console.error(err); }
                updateActiveCard(c => ({ ...c, dueDate: undefined })); 
                setIsDateSelectionOpen(false); 
              }} className="flex-1 h-9 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Remove</button>
            </div>
         </div>
      )}

      {showCreateBoard && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-5" onClick={() => setShowCreateBoard(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-8">
               <div className="h-12 w-12 rounded-2xl bg-[#fce4ec] flex items-center justify-center text-[#c91f41]"><Layout className="h-6 w-6" /></div>
               <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white">Create Board</h3>
                  <p className="text-xs font-bold text-zinc-400">Bring your team together.</p>
               </div>
            </div>
            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Title</label>
                   <input autoFocus value={newBoardTitle} onChange={e => setNewBoardTitle(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-[#c91f41] font-bold placeholder:text-zinc-400 dark:placeholder:text-zinc-500" placeholder="Sales Tracker..." />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Workspace</label>
                  <select value={newBoardWsId} onChange={e => setNewBoardWsId(Number(e.target.value))} className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none font-bold">
                    {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Visibility</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { val: "PRIVATE", label: "Private", desc: "Explicit members only", icon: Lock },
                      { val: "WORKSPACE", label: "Workspace", desc: "Everyone in your Workspace", icon: Users },
                      { val: "PUBLIC", label: "Public", desc: "Anyone can view", icon: Globe }
                    ].map(v => (
                      <button 
                        key={v.val}
                        onClick={() => setNewBoardVisibility(v.val as any)}
                         className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left", newBoardVisibility === v.val ? "border-[#c91f41] bg-[#fce4ec] dark:bg-[#c91f41]/10" : "border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10")}
                      >
                         <v.icon className={cn("h-5 w-5", newBoardVisibility === v.val ? "text-[#c91f41]" : "text-zinc-400")} />
                         <div>
                            <p className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">{v.label}</p>
                            <p className="text-[10px] text-zinc-400 font-bold">{v.desc}</p>
                         </div>
                      </button>
                    ))}
                  </div>
               </div>
            </div>
            <div className="mt-10 flex gap-3">
               <button onClick={() => setShowCreateBoard(false)} className="flex-1 h-12 rounded-2xl font-black uppercase text-xs text-zinc-400 bg-zinc-100 dark:bg-white/10 dark:hover:bg-white/15">Cancel</button>
                <button disabled={isSubmitting || !newBoardTitle.trim()} onClick={handleCreateBoard} className="flex-1 h-12 rounded-2xl font-black uppercase text-xs text-white bg-[#c91f41] shadow-lg shadow-[#c91f41]/30">Create</button>
            </div>
          </div>
        </div>
      )}

      {showCreateWs && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-5" onClick={() => setShowCreateWs(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
             <h3 className="text-xl font-black mb-8 text-zinc-900 dark:text-white">New Workspace</h3>
              <input autoFocus value={newWsName} onChange={e => setNewWsName(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-[#c91f41] font-bold mb-10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" placeholder="Engineering Team..." />
              <div className="flex gap-3">
                 <button onClick={() => setShowCreateWs(false)} className="flex-1 h-12 rounded-2xl font-black uppercase text-xs text-zinc-400 bg-zinc-100 dark:bg-white/10 dark:hover:bg-white/15">Cancel</button>
                 <button disabled={isSubmitting || !newWsName.trim()} onClick={handleCreateWorkspace} className="flex-1 h-12 rounded-2xl font-black uppercase text-xs text-white bg-[#c91f41] shadow-lg shadow-[#c91f41]/30">Create</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
