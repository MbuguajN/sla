"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient, deleteClient } from "@/app/actions/clientActions";
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
} from "lucide-react";

type ClientItem = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  projectCount: number;
  createdAt: string;
};

interface Props {
  initialClients: ClientItem[];
  canCreate: boolean;
}

export default function ClientsClient({ initialClients, canCreate }: Props) {
  const [clients, setClients] = useState<ClientItem[]>(initialClients);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
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

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setFormData({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      description: "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createClient({
        name: formData.name,
        contactName: formData.contactName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        description: formData.description || undefined,
      });

      // Refresh to get new client
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500">{clients.length} total clients</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-[#c91f41]" />
              </div>
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === client.id ? null : client.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {activeMenu === client.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit2 className="h-4 w-4" />
                        View Details
                      </Link>
                      {canCreate && (
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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

            <Link href={`/clients/${client.id}`}>
              <h3 className="text-base font-semibold text-gray-900 mb-1 hover:text-[#c91f41] transition-colors">
                {client.name}
              </h3>
            </Link>
            {client.contactName && (
              <p className="text-sm text-gray-500 mb-1">{client.contactName}</p>
            )}
            {client.email && (
              <p className="text-xs text-gray-400">{client.email}</p>
            )}

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <FolderKanban className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {client.projectCount} {client.projectCount === 1 ? "project" : "projects"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No clients found</p>
          <p className="text-xs text-gray-400 mt-1">
            {canCreate ? "Add a client to get started" : "No clients have been onboarded yet"}
          </p>
        </div>
      )}

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Onboard New Client</h2>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                  placeholder="Company/Client name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                  placeholder="Primary contact name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41] resize-none"
                  placeholder="Brief description of the client"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Onboard Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
