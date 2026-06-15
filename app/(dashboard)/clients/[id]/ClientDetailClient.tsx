"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Mail,
  Phone,
  Search,
  ArrowRight,
  Activity,
  Gauge,
  CheckCircle2,
  FolderKanban,
  FileText,
  ExternalLink,
  X,
} from "lucide-react";
import { addClientDocument, deleteClientDocument } from "@/app/actions/clientActions";

export type ProjectItem = {
  id: number;
  title: string;
  status: string;
  taskCount: number;
  doneCount: number;
  overdueCount: number;
  departments: string[];
  year: string;
  createdAt: string;
};

type ClientInfo = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  description: string | null;
  status: string;
};

type ClientDocument = {
  id: number;
  name: string;
  url: string;
};

type ClientMetrics = {
  activeProjects: number;
  overallCompletionRate: number;
  activeProjectsCompletion: number;
  clientHealth: number;
  totalCompletedWithinSla: number;
  totalMissedSla: number;
};

interface Props {
  client: ClientInfo;
  documents: ClientDocument[];
  projects: ProjectItem[];
  metrics: ClientMetrics;
  canAddProject: boolean;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  ACTIVE: {
    label: "In Production",
    classes: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
  ON_HOLD: {
    label: "On Hold",
    classes: "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400",
  },
  COMPLETED: {
    label: "Completed",
    classes: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300",
  },
  CANCELLED: {
    label: "Cancelled",
    classes: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300",
  },
};

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/);
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return value.slice(0, 2).toUpperCase();
}

export default function ClientDetailClient({ client, documents: initialDocuments, projects, metrics, canAddProject }: Props) {
  const [search, setSearch] = useState("");
  const [itemsDisplayed, setItemsDisplayed] = useState(10);
  const [documents, setDocuments] = useState<ClientDocument[]>(initialDocuments);
  const [docForm, setDocForm] = useState({ name: "", url: "" });
  const [addingDoc, setAddingDoc] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) => {
      const statusLabel = (statusConfig[project.status]?.label || project.status).toLowerCase();
      return (
        project.title.toLowerCase().includes(query) ||
        statusLabel.includes(query) ||
        project.departments.some((department) => department.toLowerCase().includes(query))
      );
    });
  }, [projects, search]);

  useEffect(() => {
    setItemsDisplayed(10);
  }, [search]);

  const displayedProjects = filteredProjects.slice(0, itemsDisplayed);
  const hasMore = itemsDisplayed < filteredProjects.length;

  const handleTableScroll = () => {
    const el = tableScrollRef.current;
    if (!el || !hasMore) return;

    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 64;
    if (nearBottom) {
      setItemsDisplayed((prev) => Math.min(prev + 10, filteredProjects.length));
    }
  };

  const handleAddDocument = async () => {
    if (!docForm.name.trim() || !docForm.url.trim()) return;
    setAddingDoc(true);
    try {
      const doc = await addClientDocument(client.id, docForm.name.trim(), docForm.url.trim());
      setDocuments((prev) => [{ id: doc.id, name: doc.name, url: doc.url }, ...prev]);
      setDocForm({ name: "", url: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add document");
    } finally {
      setAddingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      await deleteClientDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Clients
          </Link>
          <p className="text-[11px] font-black text-[#c91f41] uppercase tracking-[0.28em]">Client Overview</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
            {client.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-1">
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-[#c91f41] transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </a>
            )}
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-[#c91f41] transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </a>
            )}
          </div>

          {/* Documents */}
          <div className="mt-3 space-y-2">
            {documents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="group/doc inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {doc.name}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-0.5 text-blue-300 dark:text-blue-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover/doc:opacity-100 transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add Document Form */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={docForm.name}
                onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-[#c91f41] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder:text-zinc-600 w-40"
                placeholder="Document name"
              />
              <input
                type="url"
                value={docForm.url}
                onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
                className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-[#c91f41] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder:text-zinc-600 flex-1"
                placeholder="Google Drive URL"
              />
              <button
                onClick={handleAddDocument}
                disabled={!docForm.name.trim() || !docForm.url.trim() || addingDoc}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {canAddProject && (
          <Link
            href={`/projects/new?clientId=${client.id}`}
            className="group flex items-center gap-2.5 bg-[#a3002d] text-white px-7 py-3.5 rounded-none hover:bg-[#78001f] transition-all active:scale-95 shadow-xl shadow-[#a3002d]/25"
          >
            <Plus className="h-4 w-4" />
            <span className="font-bold tracking-tight">New Project</span>
          </Link>
        )}
      </header>

      <section className="w-full">
        <div className="bg-white dark:bg-[#0f0f0f] border-b-2 border-slate-900 dark:border-white/20 p-7 sm:p-9 flex flex-col md:flex-row justify-between gap-10">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#a3002d]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                Active Projects Completion
              </p>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black leading-none text-gray-900 dark:text-white">
                {metrics.activeProjectsCompletion}%
              </span>
              <span className="text-xs font-bold text-[#005045] bg-[#a8f1df] px-2 py-1">
                Average Across Active Projects
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#a3002d] h-full"
                style={{ width: `${Math.max(0, Math.min(metrics.activeProjectsCompletion, 100))}%` }}
              />
            </div>
          </div>

          <div className="hidden md:block w-px bg-gray-200 dark:bg-white/10" />

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#a3002d]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                Active Projects
              </p>
            </div>
            <div className="flex flex-col">
              <span className="text-5xl font-black leading-none text-gray-900 dark:text-white">
                {metrics.activeProjects}
              </span>
              <p className="text-sm text-gray-500 dark:text-zinc-500 mt-2">
                Completion Rate: <span className="text-gray-900 dark:text-white font-bold">{metrics.overallCompletionRate}%</span>
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px bg-gray-200 dark:bg-white/10" />

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#a3002d]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                Client Health
              </p>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black leading-none text-gray-900 dark:text-white">
                {metrics.clientHealth}%
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#005045]">
                SLA Driven
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              Completed SLA: <span className="font-bold text-emerald-600 dark:text-emerald-400">{metrics.totalCompletedWithinSla}</span>
              <span className="mx-2">•</span>
              Missed SLA: <span className="font-bold text-red-600 dark:text-red-400">{metrics.totalMissedSla}</span>
            </p>
            <div className="w-full bg-gray-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#004238] h-full"
                style={{ width: `${Math.max(0, Math.min(metrics.clientHealth, 100))}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Active Client Projects</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter projects..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-black border border-gray-200 dark:border-white/10 focus:border-[#a3002d] focus:ring-2 focus:ring-[#a3002d]/15 text-sm w-64 transition-all rounded-none"
            />
          </div>
        </div>

        <div
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="overflow-x-auto max-h-[620px] overflow-y-auto border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f0f0f]"
        >
          <table className="w-full min-w-[760px] text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-white dark:bg-[#0f0f0f]">
              <tr className="border-b-2 border-slate-900 dark:border-white/20">
                <th className="py-4 px-6 text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Project Name</th>
                <th className="py-4 px-6 text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Created Date</th>
                <th className="py-4 px-6 text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {displayedProjects.length > 0 ? (
                displayedProjects.map((project) => {
                  const status = statusConfig[project.status] || {
                    label: project.status,
                    classes: "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400",
                  };

                  return (
                    <tr key={project.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-5 px-6">
                        <Link href={`/projects/${project.id}`} className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-[#e6eeff] dark:bg-white/10 flex items-center justify-center text-[#78001f] dark:text-[#ffb3b6] text-xs font-black">
                            {getInitials(project.title)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm text-gray-900 dark:text-white truncate group-hover:text-[#a3002d] transition-colors">
                              {project.title}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">
                              {project.departments.join(" • ") || "No Department"}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-5 px-6 text-sm text-gray-600 dark:text-zinc-400">{formatDate(project.createdAt)}</td>
                      <td className="py-5 px-6">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${status.classes}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <Link href={`/projects/${project.id}`}>
                          <ArrowRight className="h-4 w-4 text-gray-300 dark:text-zinc-600 group-hover:text-[#a3002d] transition-colors inline-block" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-16 px-6 text-center">
                    <FolderKanban className="h-12 w-12 text-gray-200 dark:text-zinc-700 mx-auto mb-4" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                      {search ? "No projects match your search" : "No projects yet"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-600 mt-1">
                      {!search && canAddProject ? "Create a project to get started" : ""}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
