"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient, updateClient, deleteClient, closeClient, addClientDocument, deleteClientDocument } from "@/app/actions/clientActions";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Briefcase,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  FolderKanban,
  X,
  AlertCircle,
  ListTodo,
  Activity,
  ExternalLink,
  FileText,
} from "lucide-react";

type ClientDocument = {
  id: number;
  name: string;
  url: string;
};

type ClientItem = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  status: "ACTIVE" | "CLOSED";
  projectCount: number;
  taskCount: number;
  activeTasks: number;
  health: "HEALTHY" | "AT_RISK" | "ONBOARDING";
  createdAt: string;
  documents: ClientDocument[];
};

interface Props {
  initialClients: ClientItem[];
  canCreate: boolean;
  canClose: boolean;
}

const healthConfig = {
  HEALTHY: { label: "Healthy", bg: "bg-emerald-50 dark:bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/30" },
  AT_RISK: { label: "At Risk", bg: "bg-amber-50 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-500/30" },
  ONBOARDING: { label: "Onboarding", bg: "bg-blue-50 dark:bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-500/30" },
};

export default function ClientsClient({ initialClients, canCreate, canClose }: Props) {
  const [clients, setClients] = useState<ClientItem[]>(initialClients);
  const [search, setSearch] = useState("");
  const [itemsDisplayed, setItemsDisplayed] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    description: "",
  });

  const [docForm, setDocForm] = useState({ name: "", url: "" });

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({ name: "", contactName: "", email: "", phone: "", description: "" });
    setDocForm({ name: "", url: "" });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (client: ClientItem) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      contactName: client.contactName || "",
      email: client.email || "",
      phone: client.phone || "",
      description: client.description || "",
    });
    setDocForm({ name: "", url: "" });
    setError("");
    setActiveMenu(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: formData.name,
          contactName: formData.contactName || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          description: formData.description || undefined,
        });
      } else {
        await createClient({
          name: formData.name,
          contactName: formData.contactName || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          description: formData.description || undefined,
        });
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    if (!docForm.name.trim() || !docForm.url.trim() || !editingClient) return;
    try {
      const doc = await addClientDocument(editingClient.id, docForm.name.trim(), docForm.url.trim());
      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient.id
            ? { ...c, documents: [...c.documents, { id: doc.id, name: doc.name, url: doc.url }] }
            : c
        )
      );
      setDocForm({ name: "", url: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add document");
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!editingClient) return;
    try {
      await deleteClientDocument(docId);
      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient.id
            ? { ...c, documents: c.documents.filter((d) => d.id !== docId) }
            : c
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const handleDelete = async (clientId: number) => {
    if (!confirm("Are you sure you want to delete this client? This will also delete all associated projects and tasks.")) return;
    try {
      await deleteClient(clientId);
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete client");
    }
  };

  const handleClose = async (clientId: number) => {
    if (!confirm("Close this client? No new projects or tasks can be created for them after this.")) return;
    setActiveMenu(null);
    try {
      await closeClient(clientId);
      setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, status: "CLOSED" } : c));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to close client");
    }
  };

  const displayedClients = filteredClients.slice(0, itemsDisplayed);
  const hasMore = itemsDisplayed < filteredClients.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fff1f2] flex items-center justify-center shadow-sm">
            <Briefcase className="h-6 w-6 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Client Partners</h1>
            <p className="text-[11px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{clients.length} Active Accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-600" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setItemsDisplayed(20);
              }}
              className="w-64 pl-11 pr-4 py-2.5 text-sm font-medium bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl placeholder-gray-400 dark:placeholder:text-zinc-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41] transition-all"
            />
          </div>
          {canCreate && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#c91f41] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#a61835] transition-colors shadow-lg shadow-[#c91f41]/20"
            >
              <Plus className="h-4 w-4" />
              New Client
            </button>
          )}
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* New Client Card (CTA) */}
        {canCreate && (
          <button
            onClick={openAddModal}
            className="group flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-[#c91f41]/30 hover:bg-[#fff1f2]/30 dark:hover:bg-[#c91f41]/10 transition-all min-h-[220px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/10 group-hover:bg-[#c91f41] flex items-center justify-center transition-colors">
              <Plus className="h-6 w-6 text-gray-400 dark:text-zinc-500 group-hover:text-white transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 dark:text-white">Onboard New Client</p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mt-1">Start a new engagement</p>
            </div>
          </button>
        )}

        {displayedClients.map((client) => {
          const hc = healthConfig[client.health];
          return (
            <div
              key={client.id}
              className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md transition-all overflow-hidden group"
            >
              <div className="p-6">
                {/* Top: Health badge + menu */}
                <div className="flex items-center justify-between mb-5">
                  {client.status === "CLOSED" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-zinc-500 border-gray-200 dark:border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Closed
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${hc.bg} ${hc.text} ${hc.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${client.health === "HEALTHY" ? "bg-emerald-500" : client.health === "AT_RISK" ? "bg-amber-500" : "bg-blue-500"}`} />
                      {hc.label}
                    </span>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === client.id ? null : client.id)}
                      className="p-1.5 text-gray-300 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {activeMenu === client.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#111111] rounded-xl shadow-lg dark:shadow-black/50 border border-gray-100 dark:border-white/10 py-1 z-20">
                          <Link
                            href={`/clients/${client.id}`}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5"
                          >
                            <Edit2 className="h-4 w-4" />
                            View Details
                          </Link>
                          {canCreate && (
                            <button
                              onClick={() => openEditModal(client)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit Client
                            </button>
                          )}
                          {canClose && client.status === "ACTIVE" && (
                            <button
                              onClick={() => handleClose(client.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                            >
                              <X className="h-4 w-4" />
                              Close Client
                            </button>
                          )}
                          {canCreate && (
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Client Info */}
                <Link href={`/clients/${client.id}`}>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1 group-hover:text-[#c91f41] transition-colors tracking-tight">
                    {client.name}
                  </h3>
                </Link>
                {client.contactName && (
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">{client.contactName}</p>
                )}
                {client.email && (
                  <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">{client.email}</p>
                )}

                {/* Documents */}
                {client.documents.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {client.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                      >
                        <FileText className="h-3 w-3" />
                        {doc.name}
                        <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Stats Row */}
                <div className="flex items-center gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                      <FolderKanban className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white">{client.projectCount}</p>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">Projects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                      <ListTodo className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white">{client.taskCount}</p>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">Tasks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white">{client.activeTasks}</p>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => setItemsDisplayed((prev) => prev + 20)}
            className="px-6 py-3 bg-[#c91f41] hover:bg-[#a61835] text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all active:scale-95"
          >
            Load More ({itemsDisplayed} of {filteredClients.length})
          </button>
        </div>
      )}

      {filteredClients.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/10">
          <Briefcase className="h-12 w-12 text-gray-200 dark:text-zinc-700 mx-auto mb-4" />
          <p className="text-sm font-black text-gray-700 dark:text-zinc-300">No clients found</p>
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest mt-2">
            {canCreate ? "Onboard a client to get started" : "No clients have been onboarded yet"}
          </p>
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white dark:bg-[#111111] rounded-3xl shadow-2xl dark:shadow-black/60 w-full max-w-2xl mx-4 p-8 border border-transparent dark:border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{editingClient ? "Edit Client" : "Onboard New Client"}</h2>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest mt-1">{editingClient ? "Update details" : "New partnership"}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-5 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-600 mb-2 block">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 text-sm font-medium bg-gray-50 dark:bg-black border-2 border-transparent dark:border-white/10 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-black focus:border-[#c91f41] transition-all text-gray-900 dark:text-white"
                  placeholder="Company/Client name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-600 mb-2 block">
                    Contact
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-4 py-3 text-sm font-medium bg-gray-50 dark:bg-black border-2 border-transparent dark:border-white/10 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-black focus:border-[#c91f41] transition-all text-gray-900 dark:text-white"
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-600 mb-2 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 text-sm font-medium bg-gray-50 dark:bg-black border-2 border-transparent dark:border-white/10 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-black focus:border-[#c91f41] transition-all text-gray-900 dark:text-white"
                    placeholder="Email"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-600 mb-2 block">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 text-sm font-medium bg-gray-50 dark:bg-black border-2 border-transparent dark:border-white/10 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-black focus:border-[#c91f41] transition-all text-gray-900 dark:text-white"
                    placeholder="Phone"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-600 mb-2 block">
                  Description
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(val) => setFormData({ ...formData, description: val })}
                  placeholder="Brief description of the client"
                  height={150}
                />
              </div>

              {/* Documents Section (Edit mode only) */}
              {editingClient && (
                <div className="pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-600 mb-2 block">
                    Documents
                  </label>
                  {clients.find((c) => c.id === editingClient.id)?.documents && clients.find((c) => c.id === editingClient.id)!.documents.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {clients.find((c) => c.id === editingClient.id)!.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline min-w-0">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{doc.name}</span>
                          </a>
                          <button type="button" onClick={() => handleDeleteDocument(doc.id)} className="p-1 text-gray-400 hover:text-red-500 shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={docForm.name}
                      onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm font-medium bg-gray-50 dark:bg-black border-2 border-transparent dark:border-white/10 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-black focus:border-[#c91f41] transition-all text-gray-900 dark:text-white"
                      placeholder="Document name"
                    />
                    <input
                      type="url"
                      value={docForm.url}
                      onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm font-medium bg-gray-50 dark:bg-black border-2 border-transparent dark:border-white/10 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-black focus:border-[#c91f41] transition-all text-gray-900 dark:text-white"
                      placeholder="Google Drive URL"
                    />
                    <button
                      type="button"
                      onClick={handleAddDocument}
                      disabled={!docForm.name.trim() || !docForm.url.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white bg-[#c91f41] hover:bg-[#a61835] rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-[#c91f41]/20"
                >
                  {loading ? (editingClient ? "Saving..." : "Creating...") : (editingClient ? "Save Changes" : "Onboard Client")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
