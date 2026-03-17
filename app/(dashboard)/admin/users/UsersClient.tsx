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
} from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
            <Users className="h-5 w-5 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500">{users.length} total users</p>
          </div>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardBody className="p-0">
          {filteredUsers.length > 0 ? (
            <Table>
              <TableHead>
                <TableHeader>User</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Department</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleToBadgeVariant[user.role] || "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {user.departmentName || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={user.isActive ? "success" : "error"}
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.isActive ? (
                          <>
                            <Check className="h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
                          title="Edit user"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No users found</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <Card className="relative w-full max-w-md mx-4 z-50">
            <CardBody>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingUser ? "Edit User" : "Add User"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {error && (
                <Alert variant="error" className="mb-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormGroup label="Name">
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </FormGroup>

                <FormGroup label="Email">
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </FormGroup>

                <FormGroup label={`Password ${editingUser ? "(leave blank to keep current)" : ""}`}>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    {...(!editingUser && { required: true })}
                  />
                </FormGroup>

                <FormGroup label="Role">
                  <select
                    value={formData.role}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="select select-bordered w-full"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Department">
                  <select
                    value={formData.departmentId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setFormData({ ...formData, departmentId: e.target.value })
                    }
                    className="select select-bordered w-full"
                  >
                    <option value="">No Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : editingUser ? "Save Changes" : "Add User"}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
