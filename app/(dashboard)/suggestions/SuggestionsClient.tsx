"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSuggestion } from "@/app/actions/hrActions";
import { MessageSquare, Plus, X, AlertCircle } from "lucide-react";

type SuggestionItem = {
  id: number;
  title: string;
  content: string;
  category: string;
  isAnonymous: boolean;
  status: string;
  hrNote: string | null;
  createdAt: string;
};

interface Props {
  initialSuggestions: SuggestionItem[];
}

const categories = ["COMPLAINT", "SUGGESTION", "FEEDBACK", "REQUEST"];

export default function SuggestionsClient({ initialSuggestions }: Props) {
  const router = useRouter();
  const [suggestions] = useState(initialSuggestions);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "SUGGESTION" as string,
    isAnonymous: false,
  });

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700",
    IN_REVIEW: "bg-yellow-100 text-yellow-700",
    ACTIONED: "bg-green-100 text-green-700",
    CLOSED: "bg-gray-100 text-gray-700",
  };

  const categoryColors: Record<string, string> = {
    COMPLAINT: "bg-red-100 text-red-700",
    SUGGESTION: "bg-blue-100 text-blue-700",
    FEEDBACK: "bg-purple-100 text-purple-700",
    REQUEST: "bg-orange-100 text-orange-700",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createSuggestion({
        title: formData.title,
        content: formData.content,
        category: formData.category as "COMPLAINT" | "SUGGESTION" | "FEEDBACK" | "REQUEST",
        isAnonymous: formData.isAnonymous,
      });
      setShowModal(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-[#c91f41]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Suggestions</h1>
            <p className="text-sm text-gray-500">{suggestions.length} submissions</p>
          </div>
        </div>
        <button onClick={() => { setShowModal(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors">
          <Plus className="h-4 w-4" />New Suggestion
        </button>
      </div>

      <div className="space-y-3">
        {suggestions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">{s.title}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[s.category]}`}>{s.category}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[s.status]}`}>{s.status.replace("_", " ")}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">{s.content}</p>
            {s.isAnonymous && <p className="text-xs text-gray-400 mt-2 italic">Submitted anonymously</p>}
            {s.hrNote && <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">HR: {s.hrNote}</p>}
            <p className="text-xs text-gray-400 mt-2">{new Date(s.createdAt).toLocaleDateString()}</p>
          </div>
        ))}

        {suggestions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No suggestions yet</p>
            <p className="text-xs text-gray-400 mt-1">Share your feedback or suggestions</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">New Suggestion</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            {error && (<div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>)}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea required value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41] resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isAnonymous} onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                  className="w-4 h-4 text-[#c91f41] rounded border-gray-300 focus:ring-[#c91f41]" />
                <span className="text-sm text-gray-700">Submit anonymously</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-[#c91f41] hover:bg-[#a61835] rounded-lg disabled:opacity-50">
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
