"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProject } from "@/app/actions/projectActions";
import RichTextEditor from "@/components/RichTextEditor";
import {
  ArrowLeft,
  Building2,
  FileText,
  Users,
  Check,
  AlertCircle,
  Link as LinkIcon,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

type Client = { id: number; name: string };
type Department = { id: number; name: string; slug: string };

interface Props {
  clients: Client[];
  departments: Department[];
  preselectedClientId?: number;
}

const STEPS = [
  { id: 1, title: "The Foundation", icon: Building2 },
  { id: 2, title: "Project Details", icon: FileText },
  { id: 3, title: "Departments", icon: Users },
];

export default function NewProjectClient({ clients, departments, preselectedClientId }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    clientId: preselectedClientId?.toString() || "",
    title: "",
    description: "",
    briefLinkName: "",
    briefLinkUrl: "",
    departmentIds: [] as number[],
  });

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.clientId || !formData.title.trim()) {
        setError("Please select a client and provide a project title.");
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.description.trim()) {
        setError("Please provide a project description.");
        return;
      }
      const hasBriefName = Boolean(formData.briefLinkName.trim());
      const hasBriefUrl = Boolean(formData.briefLinkUrl.trim());
      if (hasBriefName !== hasBriefUrl) {
        setError("Provide both brief link name and URL, or leave both empty.");
        return;
      }
    }
    setError("");
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const toggleDepartment = (deptId: number) => {
    setFormData((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter((id) => id !== deptId)
        : [...prev.departmentIds, deptId],
    }));
  };

  const handleSubmit = async () => {
    if (formData.departmentIds.length === 0) {
      setError("Please select at least one department involved in this project.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const project = await createProject({
        clientId: parseInt(formData.clientId),
        title: formData.title,
        description: formData.description,
        briefLinkName: formData.briefLinkName || undefined,
        briefLinkUrl: formData.briefLinkUrl || undefined,
        departmentIds: formData.departmentIds,
      });

      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* breadcrumbs/back */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-500 hover:text-[#c91f41] transition-colors mb-6"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Projects
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Progress & Info */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white dark:bg-[#111111] rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-sm dark:shadow-none sticky top-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">Create Project</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mb-6">Set up the foundations for a new engagement.</p>

            <ul className="steps steps-vertical w-full">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <li 
                    key={step.id} 
                    className={cn(
                      "step text-left before:!w-[2px]",
                      isCompleted ? "step-error" : isActive ? "step-neutral" : ""
                    )}
                    data-content={isCompleted ? "?" : step.id}
                  >
                    <div className="flex items-center gap-3 ml-4 py-4">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                        isActive ? "bg-[#c91f41] text-white shadow-lg" : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-zinc-600"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-[11px] font-extrabold uppercase tracking-widest transition-colors",
                        isActive ? "text-[#c91f41]" : "text-gray-400 dark:text-zinc-500"
                      )}>
                        {step.title}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {error && (
              <div className="mt-8 p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-xs font-semibold leading-relaxed">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Step Forms */}
        <div className="flex-1">
          <div className="bg-white dark:bg-[#111111] rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-sm dark:shadow-none min-h-[440px]">
            {/* Step 1: The Foundation */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-gray-100 dark:border-white/10 pb-6">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none">The Foundation</h2>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2 font-medium">Identify the client and project name.</p>
                </div>

                <div className="space-y-5 text-left">
                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Client Partner</span>
                    </label>
                    <div className="relative">
                      <select 
                        className="select select-bordered w-full h-12 rounded-2xl bg-gray-50 dark:bg-black border-gray-200 dark:border-white/10 focus:border-[#c91f41] focus:ring-1 focus:ring-[#c91f41] pl-10 text-sm dark:text-white"
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      >
                        <option value="" disabled>Select a client...</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-600" />
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Project Title</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g., Q3 Market Penetration" 
                      className="input input-bordered w-full h-12 rounded-2xl bg-gray-50 dark:bg-black border-gray-200 dark:border-white/10 focus:border-[#c91f41] focus:ring-1 focus:ring-[#c91f41] text-sm px-4 dark:text-white"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Project Details */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-gray-100 dark:border-white/10 pb-6">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none">Project Details</h2>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2 font-medium">Define the objective and reference materials.</p>
                </div>

                <div className="space-y-5">
                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Brief Link Name (Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Creative Brief"
                      className="input input-bordered w-full h-12 rounded-2xl bg-gray-50 dark:bg-black border-gray-200 dark:border-white/10 focus:border-[#c91f41] focus:ring-1 focus:ring-[#c91f41] text-sm px-4 dark:text-white"
                      value={formData.briefLinkName}
                      onChange={(e) => setFormData({ ...formData, briefLinkName: e.target.value })}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Brief Link URL (Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://google.drive/..."
                        className="input input-bordered w-full h-12 rounded-2xl bg-gray-50 dark:bg-black border-gray-200 dark:border-white/10 focus:border-[#c91f41] focus:ring-1 focus:ring-[#c91f41] pl-10 text-sm dark:text-white"
                        value={formData.briefLinkUrl}
                        onChange={(e) => setFormData({ ...formData, briefLinkUrl: e.target.value })}
                      />
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-600" />
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Description / Scope</span>
                    </label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(val) => setFormData({ ...formData, description: val })}
                      placeholder="What are we trying to achieve? Provide high-level details..."
                      height={200}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Departments Configuration */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-gray-100 dark:border-white/10 pb-6">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none">Departments Configuration</h2>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2 font-medium">Select the teams that will be part of this project.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {departments.map((dept) => {
                    const isSelected = formData.departmentIds.includes(dept.id);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => toggleDepartment(dept.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                          isSelected 
                            ? "border-[#c91f41] bg-[#fdf2f4] text-[#c91f41]" 
                            : "border-gray-50 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:border-gray-200 dark:hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center",
                            isSelected ? "bg-[#c91f41] text-white" : "bg-white dark:bg-black text-gray-300 dark:text-zinc-600"
                          )}>
                             <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="block text-sm font-black">{dept.name}</span>

                          </div>
                        </div>
                        {isSelected && <Check className="h-5 w-5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-white/10 pt-5">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={cn(
                  "btn btn-ghost rounded-xl px-6 font-black gap-2 transition-all h-11",
                  currentStep === 1 ? "opacity-0 pointer-events-none" : "hover:bg-gray-100 dark:hover:bg-white/10 dark:text-zinc-400"
                )}
              >
                Back
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn h-11 bg-[#c91f41] hover:bg-[#a61a35] text-white border-none rounded-xl px-8 font-black gap-2 shadow-sm"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn h-11 bg-[#c91f41] hover:bg-[#a61a35] text-white border-none rounded-xl px-8 font-black gap-2 shadow-sm"
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Create"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
