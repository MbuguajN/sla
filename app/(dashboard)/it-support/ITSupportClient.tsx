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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
            <Headphones className="h-5 w-5 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">IT Support</h1>
            <p className="text-sm text-gray-500">{tickets.length} tickets</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === s
                  ? "bg-[#c91f41] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                {isITStaff && (
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Raised By
                  </th>
                )}
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">
                        {ticket.description}
                      </p>
                    </div>
                  </td>
                  {isITStaff && (
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{ticket.creatorName}</span>
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        priorityColors[ticket.priority] || priorityColors.MEDIUM
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[ticket.status] || statusColors.OPEN
                      }`}
                    >
                      {ticket.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-600">
                      {ticket.assigneeName || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {/* IT Staff: Assign */}
                      {isITStaff && ticket.status === "OPEN" && (
                        <button
                          onClick={() => setShowAssignModal(ticket.id)}
                          className="px-2 py-1 text-xs font-medium text-[#c91f41] bg-[#fef2f4] rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Assign
                        </button>
                      )}

                      {/* Assignee or IT Staff: Start */}
                      {(ticket.assigneeId === currentUser.id || isITStaff) &&
                        ticket.status === "ASSIGNED" && (
                          <button
                            onClick={() =>
                              handleAction(
                                () => startITTicket(ticket.id),
                                `start-${ticket.id}`
                              )
                            }
                            disabled={loading === `start-${ticket.id}`}
                            className="px-2 py-1 text-xs font-medium text-white bg-[#c91f41] rounded-lg hover:bg-[#a61835] transition-colors disabled:opacity-50"
                          >
                            Start
                          </button>
                        )}

                      {/* Assignee or IT Staff: Resolve */}
                      {(ticket.assigneeId === currentUser.id || isITStaff) &&
                        ticket.status === "IN_PROGRESS" && (
                          <button
                            onClick={() =>
                              handleAction(
                                () => resolveITTicket(ticket.id),
                                `resolve-${ticket.id}`
                              )
                            }
                            disabled={loading === `resolve-${ticket.id}`}
                            className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}

                      {/* Creator or IT Staff: Close */}
                      {(ticket.creatorId === currentUser.id || isITStaff) &&
                        ticket.status === "RESOLVED" && (
                          <>
                            <button
                              onClick={() =>
                                handleAction(
                                  () => closeITTicket(ticket.id),
                                  `close-${ticket.id}`
                                )
                              }
                              disabled={loading === `close-${ticket.id}`}
                              className="px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              Close
                            </button>
                            <button
                              onClick={() =>
                                handleAction(
                                  () => reopenITTicket(ticket.id),
                                  `reopen-${ticket.id}`
                                )
                              }
                              disabled={loading === `reopen-${ticket.id}`}
                              className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                            >
                              Reopen
                            </button>
                          </>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <Headphones className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No tickets found</p>
            <p className="text-xs text-gray-400 mt-1">Create a ticket if you need IT support</p>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">New IT Support Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Detailed description of the issue..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading === "create"}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading === "create" ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAssignModal(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Assign Ticket</h2>
              <button
                onClick={() => setShowAssignModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
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
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#c91f41] hover:bg-[#fef2f4] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#fef2f4] flex items-center justify-center">
                    <span className="text-[#c91f41] text-sm font-semibold">
                      {member.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700">{member.name}</span>
                </button>
              ))}
              {itMembers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No IT staff members found
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
