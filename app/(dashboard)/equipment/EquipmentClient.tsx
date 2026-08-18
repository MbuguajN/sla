"use client";

import { useMemo, useState } from "react";
import {
  addEquipmentViewer,
  createEquipmentCategory,
  createEquipmentItem,
  deleteEquipmentItem,
  removeEquipmentViewer,
  updateEquipmentItem,
  setEquipmentSpecs,
} from "@/app/actions/equipmentActions";
import { Search, Plus, Edit2, Laptop, UserPlus, UserMinus, Trash2, Download, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";

type EquipmentStatus = "IN_USE" | "NOT_IN_USE" | "MAINTENANCE" | "RETIRED";

type Category = {
  id: number;
  name: string;
};

type EquipmentItem = {
  id: number;
  categoryId: number;
  categoryName: string;
  make: string;
  model: string;
  ownerUserId: number | null;
  ownerUserName: string | null;
  ownerLabel: string;
  status: EquipmentStatus;
  serialNumber: string;
  createdAt: string;
  specs: { specType: string; specValue: string }[];
};

type Viewer = {
  userId: number;
  name: string;
  email: string;
  isActive: boolean;
};

type UserOption = {
  id: number;
  name: string;
  email: string;
  role: string;
};

interface Props {
  currentUserRole: string;
  categories: Category[];
  items: EquipmentItem[];
  viewers: Viewer[];
  users: UserOption[];
}

const statuses: EquipmentStatus[] = ["IN_USE", "NOT_IN_USE", "MAINTENANCE", "RETIRED"];

function statusLabel(value: EquipmentStatus) {
  if (value === "IN_USE") return "In Use";
  if (value === "NOT_IN_USE") return "Not in Use";
  if (value === "MAINTENANCE") return "Maintenance";
  return "Retired";
}

export default function EquipmentClient({
  currentUserRole,
  categories,
  items,
  viewers,
  users,
}: Props) {
  const isAdmin = currentUserRole === "ADMIN";

  const [allItems, setAllItems] = useState(items);
  const [allCategories, setAllCategories] = useState(categories);
  const [allowedViewers, setAllowedViewers] = useState(viewers);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [newCategory, setNewCategory] = useState("");
  const [selectedViewerId, setSelectedViewerId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCategoryIds, setExportCategoryIds] = useState<Set<number>>(new Set());
  const [itemForm, setItemForm] = useState({
    categoryId: categories[0]?.id?.toString() || "",
    make: "",
    model: "",
    ownerSelection: "COMPANY",
    status: "IN_USE" as EquipmentStatus,
    serialNumber: "",
  });
  const [itemSpecs, setItemSpecs] = useState<{ specType: string; specValue: string }[]>([]);
  const [viewingItem, setViewingItem] = useState<EquipmentItem | null>(null);

  const viewerIds = useMemo(() => new Set(allowedViewers.map((v) => v.userId)), [allowedViewers]);

  const selectableUsers = users.filter((u) => u.role !== "ADMIN" && !viewerIds.has(u.id));

  const filtered = allItems.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      item.make.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q) ||
      item.serialNumber.toLowerCase().includes(q) ||
      (item.ownerUserName || item.ownerLabel).toLowerCase().includes(q);

    const matchesCategory = categoryFilter === "ALL" || item.categoryId === Number(categoryFilter);
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm({
      categoryId: allCategories[0]?.id?.toString() || "",
      make: "",
      model: "",
      ownerSelection: "COMPANY",
      status: "IN_USE",
      serialNumber: "",
    });
    setItemSpecs([]);
    setShowItemModal(true);
  };

  const openExportModal = () => {
    setExportCategoryIds(new Set(allCategories.map((c) => c.id)));
    setShowExportModal(true);
  };

  const toggleExportCategory = (id: number) => {
    setExportCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCategories = () => setExportCategoryIds(new Set(allCategories.map((c) => c.id)));
  const deselectAllCategories = () => setExportCategoryIds(new Set());

  const handleExportCSV = () => {
    const toExport = filtered.filter((item) => exportCategoryIds.has(item.categoryId));
    if (toExport.length === 0) {
      alert("No items to export for the selected categories.");
      return;
    }

    const headers = ["Category", "Make", "Model", "Owner", "Status", "Serial Number", "Date Added"];
    const rows = toExport.map((item) => [
      item.categoryName,
      item.make,
      item.model,
      item.ownerUserName || item.ownerLabel || "5DM",
      statusLabel(item.status),
      item.serialNumber || "N/A",
      new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `equipment-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const openEditItem = (item: EquipmentItem) => {
    setEditingItem(item);
    setItemForm({
      categoryId: item.categoryId.toString(),
      make: item.make,
      model: item.model,
      ownerSelection: item.ownerUserId ? `USER:${item.ownerUserId}` : "COMPANY",
      status: item.status,
      serialNumber: item.serialNumber || "",
    });
    setItemSpecs(item.specs.map((s) => ({ ...s })));
    setShowItemModal(true);
  };

  const submitCategory = async () => {
    if (!newCategory.trim()) return;
    setBusy(true);
    setError("");
    try {
      const category = await createEquipmentCategory(newCategory);
      setAllCategories((prev) => [...prev, { id: category.id, name: category.name }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategory("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setBusy(false);
    }
  };

  const submitViewerAdd = async () => {
    if (!selectedViewerId) return;
    setBusy(true);
    setError("");
    try {
      const userId = Number(selectedViewerId);
      await addEquipmentViewer(userId);
      const user = users.find((u) => u.id === userId);
      if (user) {
        setAllowedViewers((prev) => [{ userId: user.id, name: user.name, email: user.email, isActive: true }, ...prev]);
      }
      setSelectedViewerId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add viewer");
    } finally {
      setBusy(false);
    }
  };

  const submitViewerRemove = async (userId: number) => {
    setBusy(true);
    setError("");
    try {
      await removeEquipmentViewer(userId);
      setAllowedViewers((prev) => prev.filter((v) => v.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove viewer");
    } finally {
      setBusy(false);
    }
  };

  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const ownerUserId = itemForm.ownerSelection.startsWith("USER:")
        ? Number(itemForm.ownerSelection.replace("USER:", ""))
        : null;

      const payload = {
        categoryId: Number(itemForm.categoryId),
        make: itemForm.make,
        model: itemForm.model,
        status: itemForm.status,
        serialNumber: itemForm.serialNumber,
        ownerUserId,
        ownerLabel: "5DM",
      };

      if (editingItem) {
        await updateEquipmentItem(editingItem.id, payload);
        await setEquipmentSpecs(editingItem.id, itemSpecs);

        const owner = payload.ownerUserId ? users.find((u) => u.id === payload.ownerUserId) : null;
        const category = allCategories.find((c) => c.id === payload.categoryId);

        setAllItems((prev) =>
          prev.map((it) =>
            it.id === editingItem.id
              ? {
                  ...it,
                  categoryId: payload.categoryId,
                  categoryName: category?.name || it.categoryName,
                  make: payload.make,
                  model: payload.model,
                  status: payload.status,
                  serialNumber: payload.serialNumber || "",
                  ownerUserId: payload.ownerUserId,
                  ownerUserName: owner?.name || null,
                  ownerLabel: payload.ownerLabel || "5DM",
                  specs: itemSpecs,
                }
              : it
          )
        );
      } else {
        const created = await createEquipmentItem(payload);
        await setEquipmentSpecs(created.id, itemSpecs);
        const owner = payload.ownerUserId ? users.find((u) => u.id === payload.ownerUserId) : null;
        const category = allCategories.find((c) => c.id === payload.categoryId);
        setAllItems((prev) => [
          {
            id: created.id,
            categoryId: payload.categoryId,
            categoryName: category?.name || "",
            make: payload.make,
            model: payload.model,
            status: payload.status,
            serialNumber: payload.serialNumber || "",
            ownerUserId: payload.ownerUserId,
            ownerUserName: owner?.name || null,
            ownerLabel: payload.ownerLabel || "5DM",
            createdAt: new Date().toISOString(),
            specs: itemSpecs,
          },
          ...prev,
        ]);
      }

      setShowItemModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setBusy(false);
    }
  };

  const submitItemDelete = async (item: EquipmentItem) => {
    const confirmed = window.confirm(`Delete ${item.make} ${item.model}? This cannot be undone.`);
    if (!confirmed) return;

    setBusy(true);
    setError("");
    try {
      await deleteEquipmentItem(item.id);
      setAllItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#0a0a0a] border-2 border-gray-900 dark:border-white/10 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] dark:shadow-none flex items-center justify-center">
            <Laptop className="h-6 w-6 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Equipment Registry</h1>
            <p className="text-[10px] font-bold text-[#c91f41] uppercase tracking-[0.2em]">Inventory and Ownership Control</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateItem}
            className="h-12 px-6 bg-[#c91f41] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Equipment
          </button>
        )}
        <button
          onClick={openExportModal}
          className="h-12 px-6 bg-white dark:bg-[#0a0a0a] border-2 border-gray-900 dark:border-white/10 text-gray-900 dark:text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] dark:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-bold">{error}</div>
      )}

      {isAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border-2 border-gray-900 dark:border-white/10 p-5 space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Categories</p>
            <div className="flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Create category e.g. Monitors"
                className="flex-1 h-11 px-3 bg-white dark:bg-black border-2 border-gray-900 dark:border-white/10 rounded-xl text-sm"
              />
              <button
                onClick={submitCategory}
                disabled={busy}
                className="h-11 px-4 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border-2 border-gray-900 dark:border-white/10 p-5 space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Viewer Access</p>
            <div className="flex gap-2">
              <select
                value={selectedViewerId}
                onChange={(e) => setSelectedViewerId(e.target.value)}
                className="flex-1 h-11 px-3 bg-white dark:bg-black border-2 border-gray-900 dark:border-white/10 rounded-xl text-sm"
              >
                <option value="">Select user to grant view access</option>
                {selectableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <button
                onClick={submitViewerAdd}
                disabled={busy || !selectedViewerId}
                className="h-11 px-4 rounded-xl bg-[#c91f41] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 inline-flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" /> Grant
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 pt-1">
              {allowedViewers.length === 0 && (
                <p className="text-xs text-gray-500">No viewer has been granted access yet.</p>
              )}
              {allowedViewers.map((v) => (
                <div key={v.userId} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2 text-xs">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-200">{v.name}</p>
                    <p className="text-gray-500">{v.email}</p>
                  </div>
                  <button
                    onClick={() => submitViewerRemove(v.userId)}
                    className="h-8 px-3 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1"
                  >
                    <UserMinus className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="relative lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search make, model, serial or owner"
            className="w-full h-11 pl-10 pr-3 bg-white dark:bg-[#0a0a0a] border-2 border-gray-900 dark:border-white/10 rounded-xl text-sm"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 px-3 bg-white dark:bg-[#0a0a0a] border-2 border-gray-900 dark:border-white/10 rounded-xl text-sm"
        >
          <option value="ALL">All Types</option>
          {allCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 px-3 bg-white dark:bg-[#0a0a0a] border-2 border-gray-900 dark:border-white/10 rounded-xl text-sm"
        >
          <option value="ALL">All Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border-2 border-gray-900 dark:border-white/10 shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Type</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Make</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Model</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Owner</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Status</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Serial Number</th>
                {isAdmin && <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Ops</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {filtered.map((item) => (
                <tr key={item.id} onClick={() => setViewingItem(item)} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                  <td className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">{item.categoryName}</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 dark:text-white">{item.make}</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-700 dark:text-gray-300">{item.model}</td>
                  <td className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">{item.ownerUserName || item.ownerLabel || "5DM"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        item.status === "IN_USE" && "bg-emerald-50 text-emerald-700",
                        item.status === "NOT_IN_USE" && "bg-zinc-100 text-zinc-700",
                        item.status === "MAINTENANCE" && "bg-amber-50 text-amber-700",
                        item.status === "RETIRED" && "bg-rose-50 text-rose-700"
                      )}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{item.serialNumber || "N/A"}</td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditItem(item)}
                          className="h-8 px-3 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => submitItemDelete(item)}
                          className="h-8 px-3 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm font-bold text-gray-600 dark:text-gray-400">No equipment matches your filters.</p>
          </div>
        )}
      </div>

      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowItemModal(false)} />
          <form onSubmit={submitItem} className="relative w-full max-w-2xl bg-white dark:bg-[#0a0a0a] rounded-3xl border-2 border-gray-900 dark:border-white/10 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-white/10">
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">{editingItem ? "Edit Equipment" : "Add Equipment"}</h2>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Category</label>
                <select
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full h-11 px-3 border-2 border-gray-900 dark:border-white/10 rounded-xl bg-white dark:bg-black text-sm"
                  required
                >
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Status</label>
                <select
                  value={itemForm.status}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, status: e.target.value as EquipmentStatus }))}
                  className="w-full h-11 px-3 border-2 border-gray-900 dark:border-white/10 rounded-xl bg-white dark:bg-black text-sm"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Make</label>
                <input
                  value={itemForm.make}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, make: e.target.value }))}
                  className="w-full h-11 px-3 border-2 border-gray-900 dark:border-white/10 rounded-xl bg-white dark:bg-black text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Model</label>
                <input
                  value={itemForm.model}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, model: e.target.value }))}
                  className="w-full h-11 px-3 border-2 border-gray-900 dark:border-white/10 rounded-xl bg-white dark:bg-black text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Owner</label>
                <select
                  value={itemForm.ownerSelection}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, ownerSelection: e.target.value }))}
                  className="w-full h-11 px-3 border-2 border-gray-900 dark:border-white/10 rounded-xl bg-white dark:bg-black text-sm"
                >
                  <option value="COMPANY">5DM (Company)</option>
                  {users.map((u) => (
                    <option key={u.id} value={`USER:${u.id}`}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Serial Number</label>
                <input
                  value={itemForm.serialNumber}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
                  className="w-full h-11 px-3 border-2 border-gray-900 dark:border-white/10 rounded-xl bg-white dark:bg-black text-sm"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Specs</label>
                  <button
                    type="button"
                    onClick={() => setItemSpecs((prev) => [...prev, { specType: "", specValue: "" }])}
                    className="h-7 px-3 rounded-lg bg-gray-100 dark:bg-white/10 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Spec
                  </button>
                </div>
                {itemSpecs.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No specs added yet.</p>
                )}
                {itemSpecs.map((spec, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      value={spec.specType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemSpecs((prev) => prev.map((s, i) => i === idx ? { ...s, specType: val } : s));
                      }}
                      placeholder="Spec type (e.g. Processor)"
                      className="flex-1 h-9 px-3 border-2 border-gray-900 dark:border-white/10 rounded-xl bg-white dark:bg-black text-sm"
                    />
                    <input
                      value={spec.specValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemSpecs((prev) => prev.map((s, i) => i === idx ? { ...s, specValue: val } : s));
                      }}
                      placeholder="Spec value (e.g. i5 8th Gen)"
                      className="flex-1 h-9 px-3 border-2 border-gray-900 dark:border-white/10 rounded-xl bg-white dark:bg-black text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setItemSpecs((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="h-10 px-4 rounded-xl border border-gray-300 dark:border-white/20 text-xs font-black uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-4 rounded-xl bg-[#c91f41] text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
              >
                {editingItem ? "Save Changes" : "Create Item"}
              </button>
            </div>
          </form>
        </div>
      )}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowExportModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-3xl border-2 border-gray-900 dark:border-white/10 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-white/10">
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">Export Equipment</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select categories to include in the CSV export.</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={selectAllCategories}
                  className="h-8 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllCategories}
                  className="h-8 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  Deselect All
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-100 dark:border-white/10 rounded-xl p-3">
                {allCategories.map((cat) => {
                  const count = filtered.filter((i) => i.categoryId === cat.id).length;
                  return (
                    <label
                      key={cat.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={exportCategoryIds.has(cat.id)}
                        onChange={() => toggleExportCategory(cat.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#c91f41] focus:ring-[#c91f41]"
                      />
                      <span className="text-sm font-bold text-gray-900 dark:text-white flex-1">{cat.name}</span>
                      <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">{count} items</span>
                    </label>
                  );
                })}
              </div>

              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                {filtered.filter((i) => exportCategoryIds.has(i.categoryId)).length} items will be exported based on current filters.
              </p>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="h-10 px-4 rounded-xl border border-gray-300 dark:border-white/20 text-xs font-black uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleExportCSV}
                disabled={exportCategoryIds.size === 0}
                className="h-10 px-4 rounded-xl bg-[#c91f41] text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setViewingItem(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0a0a0a] rounded-3xl border-2 border-gray-900 dark:border-white/10 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">Equipment Details</h2>
              <button onClick={() => setViewingItem(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Type</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{viewingItem.categoryName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Status</p>
                  <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", viewingItem.status === "IN_USE" && "bg-emerald-50 text-emerald-700", viewingItem.status === "NOT_IN_USE" && "bg-zinc-100 text-zinc-700", viewingItem.status === "MAINTENANCE" && "bg-amber-50 text-amber-700", viewingItem.status === "RETIRED" && "bg-rose-50 text-rose-700")}>
                    {statusLabel(viewingItem.status)}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Make</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{viewingItem.make}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Model</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{viewingItem.model}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Owner</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{viewingItem.ownerUserName || viewingItem.ownerLabel || "5DM"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Serial Number</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">{viewingItem.serialNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Date Added</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(viewingItem.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>

              {viewingItem.specs.length > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Specifications</p>
                  <div className="space-y-1.5">
                    {viewingItem.specs.map((spec, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-white/5">
                        <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase min-w-[100px]">{spec.specType}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{spec.specValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewingItem.specs.length === 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Specifications</p>
                  <p className="text-xs text-gray-400 italic">No specs recorded.</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
              {isAdmin && (
                <button
                  onClick={() => { setViewingItem(null); openEditItem(viewingItem); }}
                  className="h-10 px-4 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
              )}
              <button
                onClick={() => setViewingItem(null)}
                className="h-10 px-4 rounded-xl border border-gray-300 dark:border-white/20 text-xs font-black uppercase tracking-widest"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
