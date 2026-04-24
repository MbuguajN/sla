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
          className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#c91f41] transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
          Back to Tasks
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-4">
          <div className="sticky top-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2 leading-tight">New Assignment</h1>
            <p className="text-sm text-gray-500 mb-8">Define the requirements and allocate resources.</p>

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

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[32px] border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] p-6 md:p-8 relative overflow-hidden transition-all">
            {currentStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Parent Project</label>
                    <div className="relative group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={formData.projectId}
                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                        className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-5 text-sm font-bold text-gray-900 appearance-none focus:bg-white focus:border-[#c91f41] transition-all outline-none"
                      >
                        <option value="">Search Projects...</option>
                        {filteredProjects.map((p) => (
                          <option key={p.id} value={p.id}>{p.clientName} &gt; {p.title}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none rotate-90" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Task Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Logo Design V1"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl px-5 text-sm font-bold text-gray-900 focus:bg-white focus:border-[#c91f41] transition-all outline-none placeholder:text-gray-300"
                    />
                  </div>

                  <div className="pt-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Priority Level</label>
                    <div className="grid grid-cols-4 gap-2">
                       {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                         <button
                           key={p}
                           type="button"
                           onClick={() => setFormData({ ...formData, priority: p })}
                           className={cn(
                             "h-12 rounded-xl text-[10px] font-black tracking-widest transition-all border-2",
                             formData.priority === p 
                               ? "bg-gray-900 border-gray-900 text-white" 
                               : "bg-gray-50 border-transparent text-gray-400 hover:border-gray-200"
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Technical Instruction</label>
                    <textarea
                      placeholder="What needs to be done? Include specific dimensions, formats, or requirements..."
                      rows={6}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-5 text-sm font-bold text-gray-900 focus:bg-white focus:border-[#c91f41] transition-all outline-none placeholder:text-gray-300 resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">External Links & Assets</label>
                      <button 
                        onClick={addLink}
                        type="button"
                        className="text-[10px] font-black text-[#c91f41] uppercase tracking-widest hover:underline"
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
                            className="flex-1 h-12 bg-gray-50 border-2 border-transparent rounded-xl px-4 text-[11px] font-bold focus:bg-white focus:border-[#c91f41] outline-none"
                          />
                          <input
                            placeholder="URL (https://...)"
                            value={link.url}
                            onChange={(e) => updateLink(idx, "url", e.target.value)}
                            className="flex-[2] h-12 bg-gray-50 border-2 border-transparent rounded-xl px-4 text-[11px] font-bold focus:bg-white focus:border-[#c91f41] outline-none"
                          />
                          <button 
                            onClick={() => removeLink(idx)}
                            type="button"
                            className="w-12 h-12 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Assigned Department</label>
                    <div className="grid grid-cols-2 gap-3">
                      {allDepartments.map((dept) => {
                        const isSelected = formData.deptId === dept.id.toString();
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, deptId: dept.id.toString() })}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                              isSelected 
                                ? "bg-gray-900 border-gray-900 text-white" 
                                : "bg-gray-50 border-transparent hover:border-gray-200 text-gray-900"
                            )}
                          >
                            <span className="text-[11px] font-black uppercase italic tracking-wide">{dept.name}</span>
                            <div className={cn(
                              "w-5 h-5 rounded-lg flex items-center justify-center transition-colors",
                              isSelected ? "bg-[#c91f41] text-white" : "bg-white border-2 border-gray-100"
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">SLA Commitment (Hours)</label>
                      <div className="relative w-full">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          min={minSlaHours}
                          value={formData.slaHours}
                          onChange={(e) => setFormData({ ...formData, slaHours: e.target.value })}
                          className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 text-sm font-bold text-gray-900 focus:bg-white focus:border-[#c91f41] transition-all outline-none"
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Minimum allowed: {minSlaHours} hours
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Brief Received</label>
                      <input
                        type="date"
                        value={formData.briefReceivedAt}
                        onChange={(e) => setFormData({ ...formData, briefReceivedAt: e.target.value })}
                        className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl px-4 text-sm font-bold text-gray-900 focus:bg-white focus:border-[#c91f41] transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
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
                  "relative h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all group active:scale-95 disabled:opacity-50",
                  currentStep === 3 
                    ? "bg-[#c91f41] text-white shadow-xl shadow-[#c91f41]/20 hover:bg-[#b01b39]" 
                    : "bg-gray-900 text-white hover:bg-black shadow-xl shadow-black/10"
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
