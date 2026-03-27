"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProject } from "@/app/actions/projectActions";
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Check,
  Building2,
  FileText,
  Users,
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
    briefLink: "",
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
        briefLink: formData.briefLink || undefined,
        departmentIds: formData.departmentIds,
      });

      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* breadcrumbs/back */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 hover:text-[#c91f41] transition-colors mb-8"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Projects
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Side: Progress & Info */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm sticky top-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2 leading-tight">Create Project</h1>
            <p className="text-sm text-gray-500 mb-8">Set up the foundations for a new engagement.</p>

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
                        isActive ? "bg-[#c91f41] text-white shadow-lg" : "bg-gray-50 text-gray-400"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-[11px] font-extrabold uppercase tracking-widest transition-colors",
                        isActive ? "text-[#c91f41]" : "text-gray-400"
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
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[500px]">
            {/* Step 1: The Foundation */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-gray-100 pb-6">
                  <h2 className="text-2xl font-black text-gray-900 leading-none">The Foundation</h2>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Identify the client and project name.</p>
                </div>

                <div className="space-y-6 text-left">
                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Client Partner</span>
                    </label>
                    <div className="relative">
                      <select 
                        className="select select-bordered w-full h-12 rounded-2xl bg-gray-50 border-gray-200 focus:border-[#c91f41] focus:ring-1 focus:ring-[#c91f41] pl-10 text-sm"
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      >
                        <option value="" disabled>Select a client...</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Project Title</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g., Q3 Market Penetration" 
                      className="input input-bordered w-full h-12 rounded-2xl bg-gray-50 border-gray-200 focus:border-[#c91f41] focus:ring-1 focus:ring-[#c91f41] text-sm"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Project Details */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-gray-100 pb-6">
                  <h2 className="text-2xl font-black text-gray-900 leading-none">Project Details</h2>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Define the objective and reference materials.</p>
                </div>

                <div className="space-y-6">
                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Brief Link (Optional)</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="url" 
                        placeholder="https://google.drive/..." 
                        className="input input-bordered w-full h-12 rounded-2xl bg-gray-50 border-gray-200 focus:border-[#c91f41] focus:ring-1 focus:ring-[#c91f41] pl-10 text-sm"
                        value={formData.briefLink}
                        onChange={(e) => setFormData({ ...formData, briefLink: e.target.value })}
                      />
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Description / Scope</span>
                    </label>
                    <textarea 
                      className="textarea textarea-bordered w-full rounded-2xl bg-gray-50 border-gray-200 focus:border-[#c91f41] focus:ring-1 focus:ring-[#c91f41] min-h-[175px] text-sm"
                      placeholder="What are we trying to achieve? Provide high-level details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Departments Configuration */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-gray-100 pb-6">
                  <h2 className="text-2xl font-black text-gray-900 leading-none">Departments Configuration</h2>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Select the teams that will be part of this project.</p>
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
                            : "border-gray-50 bg-gray-50 text-gray-600 hover:border-gray-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center",
                            isSelected ? "bg-[#c91f41] text-white" : "bg-white text-gray-300"
                          )}>
                             <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="block text-sm font-black">{dept.name}</span>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">SLA: 48H</span>
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
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={cn(
                  "btn btn-ghost rounded-xl px-6 font-black gap-2 transition-all h-11",
                  currentStep === 1 ? "opacity-0 pointer-events-none" : "hover:bg-gray-100"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn h-11 bg-[#c91f41] hover:bg-[#a61a35] text-white border-none rounded-xl px-8 font-black gap-2 shadow-sm"
                >
                  {currentStep === 1 ? "Continue to Details" : "Continue to Roles"}
                  <ChevronRight className="h-4 w-4" />
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
                    <>
                      Create Project
                      <Check className="h-4 w-4" />
                    </>
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
