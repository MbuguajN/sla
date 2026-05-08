"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTask } from "@/app/actions/taskActions";
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
  Search,
  Plus,
  Trash2,
  Clock,
  Flag
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectDept = {
  id: number;
  name: string;
  slaHours: number;
};

type Project = {
  id: number;
  title: string;
  clientId: number;
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
  minSlaHours: number;
  preselectedProjectId?: number;
}

const STEPS = [
  { id: 1, title: "Foundation", icon: Building2 },
  { id: 2, title: "Context", icon: FileText },
  { id: 3, title: "Assignment", icon: Users },
];

export default function NewTaskClient({ projects, allDepartments, minSlaHours, preselectedProjectId }: Props) {
  const router = useRouter();
  const defaultSlaHours = Math.max(48, minSlaHours).toString();
  const labelClassName = "mb-3 block text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400";
  const fieldClassName = "w-full rounded-2xl border-2 border-zinc-200/80 bg-zinc-50 text-sm font-bold text-zinc-950 outline-none transition-all placeholder:text-zinc-400 focus:border-[var(--primary)] focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-950";
  const panelClassName = "rounded-[32px] border border-zinc-200/80 bg-white/95 p-6 shadow-[10px_10px_0px_0px_rgba(24,24,27,0.12)] backdrop-blur-sm transition-all dark:border-zinc-800 dark:bg-zinc-900/90 dark:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.45)] md:p-8";
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    projectId: preselectedProjectId?.toString() || "",
    title: "",
    description: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    deptId: "",
    slaHours: defaultSlaHours,
    briefReceivedAt: "",
    links: [] as { name: string; url: string }[],
  });

  const [projectSearch, setProjectSearch] = useState("");

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id.toString() === formData.projectId);
  }, [projects, formData.projectId]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.clientName.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  const addLink = () => {
    setFormData(prev => ({
      ...prev,
      links: [...prev.links, { name: "", url: "" }]
    }));
  };

  const updateLink = (index: number, field: "name" | "url", value: string) => {
    const newLinks = [...formData.links];
    newLinks[index][field] = value;
    setFormData(prev => ({ ...prev, links: newLinks }));
  };

  const removeLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.projectId || !formData.title.trim()) {
        setError("Please select a project and provide a task title.");
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.description.trim()) {
        setError("Please provide task context.");
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

  const handleSubmit = async () => {
    if (!formData.deptId) {
      setError("Please assign a department to this task.");
      return;
    }

    if (!formData.briefReceivedAt) {
      setError("Please select the brief received date.");
      return;
    }

    const parsedSlaHours = Number.parseInt(formData.slaHours, 10);
    if (Number.isNaN(parsedSlaHours) || parsedSlaHours < minSlaHours) {
      setError(`SLA commitment cannot be below ${minSlaHours} hours.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const task = await createTask({
        projectId: parseInt(formData.projectId),
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        deptId: parseInt(formData.deptId),
        briefReceivedAt: formData.briefReceivedAt,
        slaHours: parsedSlaHours,
        links: formData.links.filter(l => l.name.trim() && l.url.trim()),
      });

      router.push("/tasks/" + task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12">
        <Link
          href="/tasks"
          className="mb-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-[var(--primary)] dark:text-zinc-400 dark:hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
          Back to Tasks
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-4">
          <div className="sticky top-8">
            <h1 className="mb-2 text-3xl font-black leading-tight text-zinc-950 dark:text-zinc-50">New Assignment</h1>
            <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">Define the requirements and allocate resources.</p>

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
                    data-content={isCompleted ? "v" : step.id}
                  >
                    <div className="flex items-center gap-3 ml-4 py-4">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                        isActive
                          ? "bg-[var(--primary)] text-white shadow-lg shadow-[color:var(--primary)]/20"
                          : isCompleted
                            ? "bg-rose-50 text-[var(--primary)] dark:bg-rose-950/40 dark:text-rose-200"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-[11px] font-extrabold uppercase tracking-widest transition-colors",
                        isActive || isCompleted ? "text-[var(--primary)]" : "text-zinc-500 dark:text-zinc-400"
                      )}>
                        {step.title}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {error && (
              <div className="mt-8 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 animate-in fade-in slide-in-from-top-2 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-xs font-semibold leading-relaxed">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className={cn(panelClassName, "relative overflow-hidden")}>
            {currentStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-6">
                  <div>
                    <label className={labelClassName}>Parent Project</label>
                    <div className="relative group">
                      <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
                      <select
                        value={formData.projectId}
                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                        className={cn(fieldClassName, "h-14 appearance-none pl-12 pr-12")}
                      >
                        <option value="">Search Projects...</option>
                        {filteredProjects.map((p) => (
                          <option key={p.id} value={p.id}>{p.clientName} &gt; {p.title}</option>
                        ))}
                      </select>
                      <ChevronRight className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500 dark:text-zinc-400" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClassName}>Task Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Logo Design V1"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={cn(fieldClassName, "h-14 px-5")}
                    />
                  </div>

                  <div className="pt-4">
                    <label className={labelClassName}>Priority Level</label>
                    <div className="grid grid-cols-4 gap-2">
                       {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                         <button
                           key={p}
                           type="button"
                           onClick={() => setFormData({ ...formData, priority: p })}
                           className={cn(
                             "h-12 rounded-xl border-2 text-[10px] font-black tracking-widest transition-all",
                             formData.priority === p 
                               ? "border-zinc-950 bg-zinc-950 text-white shadow-lg shadow-zinc-950/10 dark:border-[var(--primary)] dark:bg-[var(--primary)]"
                               : "border-zinc-200/80 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400 dark:hover:border-zinc-700"
                           )}
                         >
                           {p}
                         </button>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-6">
                  <div>
                    <label className={labelClassName}>Technical Instruction</label>
                    <textarea
                      placeholder="What needs to be done? Include specific dimensions, formats, or requirements..."
                      rows={6}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={cn(fieldClassName, "resize-none p-5")}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">External Links & Assets</label>
                      <button 
                        onClick={addLink}
                        type="button"
                        className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline"
                      >
                        + Add Resource
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {formData.links.map((link, idx) => (
                        <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2">
                          <input
                            placeholder="Link Name (e.g. Design Doc)"
                            value={link.name}
                            onChange={(e) => updateLink(idx, "name", e.target.value)}
                            className={cn(fieldClassName, "h-12 flex-1 rounded-xl px-4 text-[11px]")}
                          />
                          <input
                            placeholder="URL (https://...)"
                            value={link.url}
                            onChange={(e) => updateLink(idx, "url", e.target.value)}
                            className={cn(fieldClassName, "h-12 flex-[2] rounded-xl px-4 text-[11px]")}
                          />
                          <button 
                            onClick={() => removeLink(idx)}
                            type="button"
                            className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 text-zinc-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-8">
                  <div>
                    <label className="mb-4 block text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Assigned Department</label>
                    <div className="grid grid-cols-2 gap-3">
                      {allDepartments.map((dept) => {
                        const isSelected = formData.deptId === dept.id.toString();
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, deptId: dept.id.toString() })}
                            className={cn(
                              "flex items-center justify-between rounded-2xl border-2 p-4 transition-all",
                              isSelected 
                                ? "border-zinc-950 bg-zinc-950 text-white shadow-lg shadow-zinc-950/10 dark:border-[var(--primary)] dark:bg-zinc-900 dark:text-zinc-50"
                                : "border-zinc-200/80 bg-zinc-50 text-zinc-900 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:border-zinc-700"
                            )}
                          >
                            <span className="text-[11px] font-black uppercase italic tracking-wide">{dept.name}</span>
                            <div className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-lg transition-colors",
                              isSelected
                                ? "bg-[var(--primary)] text-white"
                                : "border-2 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                            )}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>SLA Commitment (Hours)</label>
                      <div className="relative w-full">
                        <Clock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
                        <input
                          type="number"
                          min={minSlaHours}
                          value={formData.slaHours}
                          onChange={(e) => setFormData({ ...formData, slaHours: e.target.value })}
                          className={cn(fieldClassName, "h-14 pl-12 pr-4")}
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Minimum allowed: {minSlaHours} hours
                      </p>
                    </div>

                    <div>
                      <label className={labelClassName}>Brief Received</label>
                      <input
                        type="date"
                        value={formData.briefReceivedAt}
                        onChange={(e) => setFormData({ ...formData, briefReceivedAt: e.target.value })}
                        className={cn(fieldClassName, "h-14 px-4")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-zinc-200/80 pt-6 dark:border-zinc-800">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Recall
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                disabled={loading}
                onClick={currentStep === 3 ? handleSubmit : nextStep}
                className={cn(
                  "group relative h-14 rounded-2xl px-8 font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50",
                  currentStep === 3 
                    ? "bg-[var(--primary)] text-white shadow-xl shadow-[color:var(--primary)]/25 hover:brightness-95"
                    : "bg-zinc-950 text-white shadow-xl shadow-zinc-950/15 hover:bg-black dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                )}
              >
                <span className="relative z-10 flex items-center gap-3">
                  {loading ? (
                    "Processing..."
                  ) : currentStep === 3 ? (
                    <>
                      Distribute Task
                      <Check className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
