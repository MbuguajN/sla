"use client";

import { useState } from "react";
import { createUser, updateUser, deleteUser } from "@/app/actions/adminActions";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardBody,
  CardTitle,
  Button,
  Input,
  Badge,
  Alert,
  Avatar,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  FormGroup,
} from "@/components/daisy-components";

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: string;
  departmentId: number | null;
  departmentName: string | null;
  isActive: boolean;
  createdAt: string;
};

type Department = {
  id: number;
  name: string;
  slug: string;
};

interface Props {
  initialUsers: UserItem[];
  departments: Department[];
}

export default function UsersClient({ initialUsers, departments }: Props) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as string,
    departmentId: "" as string,
  });

  const roles = ["ADMIN", "CEO", "MANAGER", "EMPLOYEE"];

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "EMPLOYEE",
      departmentId: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      departmentId: user.departmentId?.toString() || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (editingUser) {
        // Update existing user
        await updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role as "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE",
          departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
          ...(formData.password ? { password: formData.password } : {}),
        });

        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  name: formData.name,
                  email: formData.email,
                  role: formData.role,
                  departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
                  departmentName:
                    departments.find((d) => d.id.toString() === formData.departmentId)?.name ||
                    null,
                }
              : u
          )
        );
      } else {
        // Create new user
        if (!formData.password) {
          setError("Password is required for new users");
          setLoading(false);
          return;
        }

        await createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role as "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE",
          departmentId: formData.departmentId ? parseInt(formData.departmentId) : undefined,
        });

        // Refresh page to get the new user
        window.location.reload();
      }

      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;

    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const roleToBadgeVariant: Record<string, string> = {
    ADMIN: "error",
    CEO: "info",
    MANAGER: "success",
    EMPLOYEE: "secondary",
  };

  const stats = [
    { label: "Total Asset Count", value: users.length, icon: Users },
    { label: "Active Operatives", value: users.filter(u => u.isActive).length, icon: Check },
    { label: "System Admins", value: users.filter(u => u.role === 'ADMIN').length, icon: ShieldAlert },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-white/10 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#0a0a0a] border-2 border-gray-900 dark:border-white/20 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] dark:shadow-none flex items-center justify-center transition-all">
            <Users className="h-6 w-6 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Personnel Database</h1>
            <p className="text-[10px] font-bold text-[#c91f41] uppercase tracking-[0.2em]">Authorized Access Only</p>
          </div>
        </div>
        <button 
          onClick={openAddModal}
          className="h-14 px-8 bg-[#c91f41] text-white rounded-xl text-[12px] font-black uppercase tracking-[0.2em] shadow-[6px_6px_0px_0px_rgba(17,24,39,1)] dark:shadow-none hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-3"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          Register Operative
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-[#0a0a0a] p-6 rounded-2xl border-2 border-gray-900 dark:border-white/10 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] dark:shadow-none flex items-center gap-5 group hover:border-[#c91f41] transition-all">
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center border-2 border-transparent group-hover:border-[#c91f41] transition-all">
                <Icon className="h-5 w-5 text-gray-400 group-hover:text-[#c91f41]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white italic">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Filter personnel by name or identity code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-14 pl-12 pr-4 text-[13px] font-bold bg-white dark:bg-[#0a0a0a] border-2 border-gray-900 dark:border-white/10 rounded-xl placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none transition-all"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border-2 border-gray-900 dark:border-white/10 shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Operative</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Clearance</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Division</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-900/5 dark:divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-2 border-gray-900 dark:border-white/10 flex items-center justify-center font-black text-[10px] uppercase bg-gray-100 dark:bg-white/5">
                          {user.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-gray-900 dark:text-white uppercase italic group-hover:text-[#c91f41] transition-colors">{user.name}</p>
                          <p className="text-[11px] font-medium text-gray-400 lowercase">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 text-[9px] font-black rounded-lg border border-current uppercase tracking-wider",
                        user.role === 'ADMIN' ? 'text-red-600 bg-red-50 dark:bg-red-500/10' :
                        user.role === 'CEO' ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' :
                        'text-gray-600 bg-gray-50 dark:bg-white/10'
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase italic">
                        {user.departmentName || "UNASSIGNED"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={cn(
                          "px-3 py-1 text-[9px] font-black rounded-lg border-2 uppercase tracking-wider transition-all",
                          user.isActive 
                            ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500 hover:text-white" 
                            : "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500 hover:text-white"
                        )}
                      >
                        {user.isActive ? "Active" : "Locked"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-[#c91f41] hover:bg-white dark:hover:bg-white border-2 border-transparent hover:border-gray-900 transition-all"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white border-2 border-transparent hover:border-red-600 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200 dark:border-white/10">
              <Users className="h-8 w-8 text-gray-300 dark:text-zinc-700" />
            </div>
            <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic">No Personnel Detected</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Refine your search parameters</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-[#0a0a0a] rounded-[32px] border-4 border-gray-900 dark:border-white/20 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden">
            <div className="p-8 border-b-2 border-gray-900 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c91f41] flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                   <Plus className="h-5 w-5 text-white" strokeWidth={3} />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">
                  {editingUser ? "Edit Profile" : "New Operative"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              >
                <X className="h-6 w-6" strokeWidth={3} />
              </button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {error && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border-2 border-red-500 text-red-700 dark:text-red-500 rounded-2xl text-[11px] font-black uppercase tracking-wider">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[#c91f41] uppercase tracking-[0.2em] mb-2 px-1">Full Identity</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-14 px-6 text-[13px] font-bold bg-gray-50 dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 rounded-2xl focus:border-gray-900 dark:focus:border-[#c91f41] transition-all outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#c91f41] uppercase tracking-[0.2em] mb-2 px-1">Digital Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-14 px-6 text-[13px] font-bold bg-gray-50 dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 rounded-2xl focus:border-gray-900 dark:focus:border-[#c91f41] transition-all outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#c91f41] uppercase tracking-[0.2em] mb-2 px-1">Access Cipher {editingUser && "(optional)"}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-14 px-6 text-[13px] font-bold bg-gray-50 dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 rounded-2xl focus:border-gray-900 dark:focus:border-[#c91f41] transition-all outline-none dark:text-white"
                    {...(!editingUser && { required: true })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#c91f41] uppercase tracking-[0.2em] mb-2 px-1">Clearance</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full h-14 px-4 text-[13px] font-black uppercase bg-gray-50 dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 rounded-2xl focus:border-gray-900 dark:focus:border-[#c91f41] transition-all outline-none dark:text-white"
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#c91f41] uppercase tracking-[0.2em] mb-2 px-1">Division</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full h-14 px-4 text-[13px] font-black uppercase bg-gray-50 dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 rounded-2xl focus:border-gray-900 dark:focus:border-[#c91f41] transition-all outline-none dark:text-white"
                    >
                      <option value="">No Dept</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 h-14 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all underline underline-offset-4 decoration-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] h-14 bg-[#c91f41] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
                  >
                    {loading ? "Syncing..." : editingUser ? "Update Profile" : "Register Ops"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
