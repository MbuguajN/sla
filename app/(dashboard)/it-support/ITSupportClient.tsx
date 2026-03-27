"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createITTicket,
  assignITTicket,
  startITTicket,
  resolveITTicket,
  closeITTicket,
  reopenITTicket,
} from "@/app/actions/itSupportActions";
import {
  Headphones,
  Plus,
  Search,
  X,
  AlertCircle,
  User,
  Clock,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Ticket = {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  creatorName: string;
  creatorId: number;
  assigneeName: string | null;
  assigneeId: number | null;
  resolvedAt: string | null;
  createdAt: string;
};

type CurrentUser = {
  id: number;
  role: string;
  departmentSlug: string | null;
};

interface Props {
  initialTickets: Ticket[];
  currentUser: CurrentUser;
  isITStaff: boolean;
  itMembers: { id: number; name: string }[];
}

export default function ITSupportClient({
  initialTickets,
  currentUser,
  isITStaff,
  itMembers,
}: Props) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as string,
  });

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.creatorName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("create");
    setError("");

    try {
      await createITTicket({
        title: formData.title,
        description: formData.description,
        priority: formData.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      });
      setShowCreateModal(false);
      setFormData({ title: "", description: "", priority: "MEDIUM" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleAction = async (
    action: () => Promise<unknown>,
    actionName: string
  ) => {
    setLoading(actionName);
    try {
      await action();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700",
    ASSIGNED: "bg-indigo-100 text-indigo-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    RESOLVED: "bg-green-100 text-green-700",
    CLOSED: "bg-gray-100 text-gray-700",
  };

  const priorityColors: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-blue-100 text-blue-600",
    HIGH: "bg-orange-100 text-orange-600",
    CRITICAL: "bg-red-100 text-red-600",
  };

  const statuses = ["ALL", "OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#0a0a0a] border-2 border-gray-900 dark:border-white/20 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] dark:shadow-none flex items-center justify-center transition-all">
            <Headphones className="h-6 w-6 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">IT Support</h1>
            <p className="text-[10px] font-bold text-[#c91f41] uppercase tracking-[0.2em]">{tickets.length} Active Tickets</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="h-12 px-6 bg-[#c91f41] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] dark:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          Launch Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search the archive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 text-[13px] font-bold bg-white dark:bg-[#0a0a0a] border-2 border-gray-900 dark:border-white/10 rounded-xl placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "h-12 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 transition-all whitespace-nowrap",
                statusFilter === s
                  ? "bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white shadow-[3px_3px_0px_0px_rgba(201,31,65,1)]"
                  : "bg-white dark:bg-white/5 border-gray-900 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10"
              )}
            >
              {s === "ALL" ? "All Logs" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border-2 border-gray-900 dark:border-white/10 shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] dark:shadow-none overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Ticket Brief
                </th>
                {isITStaff && (
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Source
                  </th>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Priority
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Protocol
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Operative
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-900/5 dark:divide-white/5">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="max-w-xs">
                      <p className="text-[13px] font-black text-gray-900 dark:text-white uppercase italic group-hover:text-[#c91f41] transition-colors">{ticket.title}</p>
                      <p className="text-[11px] font-medium text-gray-400 line-clamp-1 italic mt-0.5">
                        {ticket.description}
                      </p>
                    </div>
                  </td>
                  {isITStaff && (
                    <td className="px-6 py-5">
                      <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase">{ticket.creatorName}</span>
                    </td>
                  )}
                  <td className="px-6 py-5">
                    <span
                      className={cn(
                        "inline-flex px-3 py-1 text-[9px] font-black rounded-lg border border-current uppercase tracking-wider",
                        priorityColors[ticket.priority] || priorityColors.MEDIUM
                      )}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={cn(
                        "inline-flex px-3 py-1 text-[9px] font-black rounded-lg border border-current uppercase tracking-wider",
                        statusColors[ticket.status] || statusColors.OPEN
                      )}
                    >
                      {ticket.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase italic">
                      {ticket.assigneeName || "UNASSIGNED"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                       {/* IT Staff: Assign */}
                       {isITStaff && ticket.status === "OPEN" && (
                        <button
                          onClick={() => setShowAssignModal(ticket.id)}
                          className="h-9 px-4 text-[9px] font-black uppercase text-[#c91f41] bg-[#fef2f4] dark:bg-[#c91f41]/10 border-2 border-[#c91f41]/20 rounded-lg hover:bg-[#c91f41] hover:text-white transition-all"
                        >
                          Assign Agent
                        </button>
                      )}

                      {/* Status progression buttons with consistent styling */}
                      {(ticket.assigneeId === currentUser.id || isITStaff) && ticket.status === "ASSIGNED" && (
                        <button
                          onClick={() => handleAction(() => startITTicket(ticket.id), `start-${ticket.id}`)}
                          disabled={loading === `start-${ticket.id}`}
                          className="h-9 px-4 text-[9px] font-black uppercase text-white bg-blue-600 rounded-lg hover:shadow-[3px_3px_0px_0px_rgba(30,58,138,1)] transition-all disabled:opacity-50"
                        >
                          Start Ops
                        </button>
                      )}

                      {(ticket.assigneeId === currentUser.id || isITStaff) && ticket.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleAction(() => resolveITTicket(ticket.id), `resolve-${ticket.id}`)}
                          disabled={loading === `resolve-${ticket.id}`}
                          className="h-9 px-4 text-[9px] font-black uppercase text-white bg-green-600 rounded-lg hover:shadow-[3px_3px_0px_0px_rgba(20,83,45,1)] transition-all disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}

                      {(ticket.creatorId === currentUser.id || isITStaff) && ticket.status === "RESOLVED" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(() => closeITTicket(ticket.id), `close-${ticket.id}`)}
                            disabled={loading === `close-${ticket.id}`}
                            className="h-9 px-4 text-[9px] font-black uppercase text-white bg-gray-900 dark:bg-zinc-800 rounded-lg transition-all"
                          >
                            Close
                          </button>
                          <button
                            onClick={() => handleAction(() => reopenITTicket(ticket.id), `reopen-${ticket.id}`)}
                            disabled={loading === `reopen-${ticket.id}`}
                            className="h-9 px-4 text-[9px] font-black uppercase text-orange-700 bg-orange-100 rounded-lg transition-all"
                          >
                            Reopen
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200 dark:border-white/10">
              <Headphones className="h-8 w-8 text-gray-300 dark:text-zinc-700" />
            </div>
            <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic">Zero Transmissions</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">No IT support logs detected in the sector</p>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white dark:bg-[#0a0a0a] rounded-[32px] border-4 border-gray-900 dark:border-white/20 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden">
            <div className="p-8 border-b-2 border-gray-900 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c91f41] flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                   <Plus className="h-5 w-5 text-white" strokeWidth={3} />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">Open Ticket</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              >
                <X className="h-6 w-6" strokeWidth={3} />
              </button>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border-2 border-red-500 text-red-700 dark:text-red-500 rounded-2xl text-[11px] font-black uppercase tracking-wider">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[#c91f41] uppercase tracking-[0.2em] mb-2 px-1">Intel Headline</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief objective..."
                    className="w-full h-14 px-6 text-[13px] font-bold bg-gray-50 dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 rounded-2xl focus:border-gray-900 dark:focus:border-[#c91f41] transition-all outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#c91f41] uppercase tracking-[0.2em] mb-2 px-1">Detailed Log</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Full incident report..."
                    className="w-full p-6 text-[13px] font-bold bg-gray-50 dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 rounded-2xl focus:border-gray-900 dark:focus:border-[#c91f41] transition-all outline-none resize-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#c91f41] uppercase tracking-[0.2em] mb-2 px-1">Threat Level</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full h-14 px-6 text-[13px] font-black uppercase bg-gray-50 dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 rounded-2xl focus:border-gray-900 dark:focus:border-[#c91f41] transition-all outline-none dark:text-white"
                  >
                    <option value="LOW">Low Impact</option>
                    <option value="MEDIUM">Standard</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL">Critical Failure</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-14 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all underline underline-offset-4 decoration-2"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    disabled={loading === "create"}
                    className="flex-[2] h-14 bg-[#c91f41] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
                  >
                    {loading === "create" ? "Transmitting..." : "Authorize Log"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowAssignModal(null)}
          />
          <div className="relative bg-white dark:bg-[#0a0a0a] rounded-[32px] border-4 border-gray-900 dark:border-white/20 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] w-full max-w-sm overflow-hidden">
            <div className="p-8 border-b-2 border-gray-900 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">Assign Agent</h2>
              <button
                onClick={() => setShowAssignModal(null)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
              >
                <X className="h-6 w-6" strokeWidth={3} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {itMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    handleAction(
                      () => assignITTicket(showAssignModal, member.id),
                      `assign-${showAssignModal}`
                    );
                    setShowAssignModal(null);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 dark:border-white/10 hover:border-[#c91f41] dark:hover:border-[#c91f41] hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center border-2 border-transparent group-hover:border-[#c91f41] transition-all">
                    <span className="text-[#c91f41] text-xs font-black uppercase">
                      {member.name[0]}
                    </span>
                  </div>
                  <span className="text-[13px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">{member.name}</span>
                </button>
              ))}
              {itMembers.length === 0 && (
                <div className="text-center py-10 italic">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No agents on standby</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
