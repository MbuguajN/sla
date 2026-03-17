"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTask } from "@/app/actions/taskActions";
import { ArrowLeft, ListChecks, AlertCircle } from "lucide-react";

type ProjectDept = {
  id: number;
  name: string;
  slaHours: number;
};

type Project = {
  id: number;
  title: string;
  clientName: string;
  departments: ProjectDept[];
};

type Department = {
  id: number;
  name: string;
};

interface Props {
  projects: Project[];
  allDepartments: Department[];
  preselectedProjectId?: number;
}

export default function NewTaskClient({ projects, allDepartments, preselectedProjectId }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    projectId: preselectedProjectId?.toString() || "",
    title: "",
    description: "",
    priority: "MEDIUM" as string,
    deptId: "",
    slaHours: "",
  });

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id.toString() === formData.projectId);
  }, [projects, formData.projectId]);

  // Departments available for this project
  const availableDepartments = useMemo(() => {
    if (!selectedProject) return allDepartments;
    // Prefer project departments, but allow all
    return allDepartments;
  }, [selectedProject, allDepartments]);

  // Get default SLA when department changes
  const handleDeptChange = (deptId: string) => {
    setFormData((prev) => {
      const projectDept = selectedProject?.departments.find(
        (d) => d.id.toString() === deptId
      );
      return {
        ...prev,
        deptId,
        slaHours: projectDept?.slaHours?.toString() || "48",
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.projectId) {
      setError("Please select a project");
      setLoading(false);
      return;
    }

    if (!formData.deptId) {
      setError("Please select a department");
      setLoading(false);
      return;
    }

    try {
      const task = await createTask({
        projectId: parseInt(formData.projectId),
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        deptId: parseInt(formData.deptId),
        slaHours: formData.slaHours ? parseInt(formData.slaHours) : undefined,
      });

      router.push(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const priorities = [
    { value: "LOW", label: "Low", color: "text-gray-500" },
    { value: "MEDIUM", label: "Medium", color: "text-blue-500" },
    { value: "HIGH", label: "High", color: "text-orange-500" },
    { value: "URGENT", label: "Urgent", color: "text-red-500" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/tasks"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tasks
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <ListChecks className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Task</h1>
          <p className="text-sm text-gray-500">Create and assign a new task</p>
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
          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project *
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value, deptId: "", slaHours: "48" })}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} ({project.clientName})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
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
              rows={4}
              placeholder="Task description and requirements..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41] resize-none"
            />
          </div>

          {/* Priority & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Department *
              </label>
              <select
                value={formData.deptId}
                onChange={(e) => handleDeptChange(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
              >
                <option value="">Select department</option>
                {availableDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SLA Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SLA Hours
            </label>
            <input
              type="number"
              min="1"
              value={formData.slaHours}
              onChange={(e) => setFormData({ ...formData, slaHours: e.target.value })}
              placeholder="48"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
            />
            <p className="text-xs text-gray-400 mt-1">
              Hours until deadline (SLA timer starts when task is confirmed)
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/tasks"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
