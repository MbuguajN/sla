"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSuggestion } from "@/app/actions/hrActions";
import RichTextEditor from "@/components/RichTextEditor";
import { 
  Message01Icon, 
  Add01Icon, 
  UserIcon,
  Idea01Icon,
  PencilIcon,
  Cancel01Icon
} from "@hugeicons/react";
import { cn } from "@/lib/utils";

type SuggestionItem = {
  id: number;
  title: string;
  category: string;
  isAnonymous: boolean;
  status: string;
  createdAt: string;
};

interface Props {
  initialSuggestions: SuggestionItem[];
}

const STEPS = [
  { id: 1, title: "Category", icon: Idea01Icon },
  { id: 2, title: "Details", icon: PencilIcon },
  { id: 3, title: "Identity", icon: UserIcon },
];

export default function SuggestionsClient({ initialSuggestions }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    category: "SUGGESTION",
    title: "",
    content: "",
    isAnonymous: false,
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createSuggestion({
        category: formData.category as any,
        title: formData.title,
        content: formData.content,
        isAnonymous: formData.isAnonymous,
      });
      setShowModal(false);
      setFormData({ category: "SUGGESTION", title: "", content: "", isAnonymous: false });
      setCurrentStep(1);
      router.refresh();
    } catch (err) {
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 2 && !formData.title.trim()) return;
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const filteredAndPaginatedSuggestions = (() => {
    let filtered = initialSuggestions.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(tableSearch.toLowerCase()) || 
                            item.category.toLowerCase().includes(tableSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (filterFromDate || filterToDate) {
        const itemDate = new Date(item.createdAt).getTime();
        const fromTime = filterFromDate ? new Date(filterFromDate).getTime() : 0;
        const toTime = filterToDate
          ? new Date(new Date(filterToDate).getTime() + 86400000).getTime()
          : Infinity;

        if (itemDate < fromTime || itemDate > toTime) return false;
      }

      return true;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const safePage = Math.min(currentPage, Math.max(1, totalPages));
    const start = (safePage - 1) * itemsPerPage;

    return {
      items: filtered.slice(start, start + itemsPerPage),
      total: filtered.length,
      currentPage: safePage,
      totalPages,
    };
  })();

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-white/10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
              <Message01Icon className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-none">Internal Voice</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#111827] dark:text-white leading-none">
            Corporate <span className="text-indigo-600 italic">Feedback</span>
          </h1>
          <p className="text-[#9ca3af] dark:text-zinc-500 font-bold text-[13px] tracking-tight">
            Share ideas and improvements with the management team.
          </p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="group flex items-center gap-3 bg-[#111827] dark:bg-black hover:bg-black dark:hover:bg-indigo-500/10 border border-transparent dark:border-white/10 text-white rounded-2xl px-6 py-4 shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-95"
        >
          <div className="w-6 h-6 rounded-lg bg-white/10 dark:bg-indigo-500/20 flex items-center justify-center">
            <Add01Icon className="w-3.5 h-3.5 text-white dark:text-indigo-500" />
          </div>
          <span className="font-black text-sm uppercase tracking-widest">Post Suggestion</span>
        </button>
      </div>

      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111111] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-600">
            {filteredAndPaginatedSuggestions.total} submission{filteredAndPaginatedSuggestions.total !== 1 ? "s" : ""} (showing {filteredAndPaginatedSuggestions.items.length})
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Search title or category..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="col-span-1 md:col-span-2 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => {
                setFilterFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => {
                setFilterToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
          {filteredAndPaginatedSuggestions.items.length > 0 ? (
            <table className="w-full min-w-[600px]">
              <thead className="sticky top-0 bg-white dark:bg-[#111111] z-10">
                <tr className="text-left text-[10px] text-gray-400 dark:text-zinc-600 font-black tracking-[0.16em] uppercase border-b border-gray-100 dark:border-white/10">
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3">Identity</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndPaginatedSuggestions.items.map((item) => {
                  const statusColors: Record<string, string> = {
                    PENDING: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30",
                    REVIEWED: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/30",
                    CLOSED: "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-white/10",
                  };
                  return (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-white/10 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{item.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1 rounded-lg">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-zinc-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${item.isAnonymous ? "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400" : "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300"}`}>
                          {item.isAnonymous ? "Anonymous" : "Named"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${statusColors[item.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <Message01Icon className="w-10 h-10 text-gray-200 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400 dark:text-zinc-500">No suggestions submitted yet</p>
            </div>
          )}
        </div>

        {filteredAndPaginatedSuggestions.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              Page {filteredAndPaginatedSuggestions.currentPage} of {filteredAndPaginatedSuggestions.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={filteredAndPaginatedSuggestions.currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/10 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(filteredAndPaginatedSuggestions.totalPages, p + 1))}
                disabled={filteredAndPaginatedSuggestions.currentPage === filteredAndPaginatedSuggestions.totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/10 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 transition-opacity" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-black rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-5 border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-4">
                  {STEPS.map(step => (
                     <div key={step.id} className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all",
                        currentStep >= step.id ? "bg-indigo-600 w-8" : "bg-gray-200 dark:bg-white/10"
                     )} />
                  ))}
               </div>
               <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <Cancel01Icon className="w-5 h-5 text-gray-400" />
               </button>
            </div>

            <div className="min-h-[200px] flex flex-col justify-center">
               {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Select Category</h2>
                     <div className="grid grid-cols-2 gap-4">
                        {["SUGGESTION", "FEEDBACK", "COMPLAINT", "REQUEST"].map(cat => (
                           <button 
                              key={cat} onClick={() => { setFormData({...formData, category: cat}); nextStep(); }}
                              className={cn(
                                 "h-16 px-6 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all",
                                 formData.category === cat ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600" : "border-gray-50 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-400"
                              )}
                           >{cat}</button>
                        ))}
                     </div>
                  </div>
               )}

               {currentStep === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Your Message</h2>
                     <input 
                        type="text" placeholder="Summary title..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-600 transition-all dark:text-white"
                     />
                     <RichTextEditor
                        value={formData.content}
                        onChange={(val) => setFormData({...formData, content: val})}
                        placeholder="Describe your suggestion in detail..."
                        height={200}
                     />
                  </div>
               )}

               {currentStep === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 text-center">
                     <div className="mx-auto w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                        <UserIcon className="w-10 h-10 text-indigo-600" />
                     </div>
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Privacy Settings</h2>
                     <div className="flex justify-center gap-4">
                        <button 
                           onClick={() => setFormData({...formData, isAnonymous: false})}
                           className={cn("px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all", !formData.isAnonymous ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-400")}
                        >Public</button>
                        <button 
                           onClick={() => setFormData({...formData, isAnonymous: true})}
                           className={cn("px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all", formData.isAnonymous ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-400")}
                        >Anonymous</button>
                     </div>
                  </div>
               )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4">
               <button onClick={() => currentStep > 1 && setCurrentStep(prev => prev -1)} className="text-xs font-black uppercase text-gray-400 hover:text-gray-900">Back</button>
               <button 
                  onClick={currentStep === 3 ? handleSubmit : nextStep} disabled={loading}
                  className="bg-[#111827] dark:bg-white text-white dark:text-black px-8 h-11 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
               >
                  {loading ? "..." : currentStep === 3 ? "Submit Hub" : "Next"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
