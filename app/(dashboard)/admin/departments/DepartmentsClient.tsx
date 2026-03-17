"use client";

import { useState } from "react";
import { updateDepartment } from "@/app/actions/adminActions";
import { Building2, Users, Edit2, X } from "lucide-react";

type Department = {
  id: number;
  name: string;
  slug: string;
  headId: number | null;
  headName: string | null;
  memberCount: number;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

interface Props {
  initialDepartments: Department[];
  users: User[];
}

export default function DepartmentsClient({ initialDepartments, users }: Props) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const managers = users.filter((u) => u.role === "MANAGER" || u.role === "CEO");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <Building2 className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500">{departments.length} departments</p>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#c91f41]/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
                <Building2 className="h-5 w-5 text-[#c91f41]" />
              </div>
              <button
                onClick={() => setEditingDept(dept)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-sm font-semibold text-gray-900 mb-1">{dept.name}</h3>
            <p className="text-xs text-gray-400 mb-4">{dept.slug}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{dept.memberCount} members</span>
              </div>
              {dept.headName && (
                <span className="text-xs text-gray-500">Head: {dept.headName}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingDept && (
        <EditDepartmentModal
          department={editingDept}
          managers={managers}
          onClose={() => setEditingDept(null)}
          onSave={(updated) => {
            setDepartments((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d))
            );
            setEditingDept(null);
          }}
        />
      )}
    </div>
  );
}

function EditDepartmentModal({
  department,
  managers,
  onClose,
  onSave,
}: {
  department: Department;
  managers: User[];
  onClose: () => void;
  onSave: (dept: Department) => void;
}) {
  const [headId, setHeadId] = useState(department.headId?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await updateDepartment(department.id, {
        headId: headId ? parseInt(headId) : null,
      });

      const newHead = managers.find((m) => m.id.toString() === headId);
      onSave({
        ...department,
        headId: headId ? parseInt(headId) : null,
        headName: newHead?.name || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Edit Department</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department Name
            </label>
            <input
              type="text"
              value={department.name}
              disabled
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department Head
            </label>
            <select
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
            >
              <option value="">No Head Assigned</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
