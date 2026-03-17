"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProject } from "@/app/actions/projectActions";
import {
  ArrowLeft,
  FolderKanban,
  AlertCircle,
  Check,
} from "lucide-react";

type Client = { id: number; name: string };
type Department = { id: number; name: string; slug: string };

interface Props {
  clients: Client[];
  departments: Department[];
  preselectedClientId?: number;
}

export default function NewProjectClient({ clients, departments, preselectedClientId }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    clientId: preselectedClientId?.toString() || "",
    title: "",
    description: "",
    briefLink: "",
    slaHours: "48",
    departmentIds: [] as number[],
  });

  const toggleDepartment = (deptId: number) => {
    setFormData((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter((id) => id !== deptId)
        : [...prev.departmentIds, deptId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.clientId) {
      setError("Please select a client");
      setLoading(false);
      return;
    }

    if (formData.departmentIds.length === 0) {
      setError("Please select at least one department");
      setLoading(false);
      return;
    }

    try {
      const project = await createProject({
        clientId: parseInt(formData.clientId),
        title: formData.title,
        description: formData.description || undefined,
        briefLink: formData.briefLink || undefined,
        departmentIds: formData.departmentIds,
        slaHours: parseInt(formData.slaHours),
      });

      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <FolderKanban className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Project</h1>
          <p className="text-sm text-gray-500">Create a new project for a client</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {error && (
          <div className="mb-6 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter project title"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Brief description of the project"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41] resize-none"
            />
          </div>

          {/* Brief Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brief Link
            </label>
            <input
              type="url"
              value={formData.briefLink}
              onChange={(e) => setFormData({ ...formData, briefLink: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
            />
            <p className="text-xs text-gray-400 mt-1">Link to project brief or documentation</p>
          </div>

          {/* Default SLA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default SLA (hours)
            </label>
            <input
              type="number"
              min="1"
              value={formData.slaHours}
              onChange={(e) => setFormData({ ...formData, slaHours: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
            />
            <p className="text-xs text-gray-400 mt-1">Default hours for tasks in this project</p>
          </div>

          {/* Departments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departments Involved *
            </label>
            <p className="text-xs text-gray-400 mb-3">Select all departments that will work on this project</p>
            <div className="grid grid-cols-2 gap-2">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => toggleDepartment(dept.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    formData.departmentIds.includes(dept.id)
                      ? "bg-[#fef2f4] border-[#c91f41] text-[#c91f41]"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      formData.departmentIds.includes(dept.id)
                        ? "bg-[#c91f41] border-[#c91f41]"
                        : "border-gray-300"
                    }`}
                  >
                    {formData.departmentIds.includes(dept.id) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  {dept.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/projects"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
