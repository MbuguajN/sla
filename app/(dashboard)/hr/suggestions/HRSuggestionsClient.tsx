"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewSuggestion } from "@/app/actions/hrActions";
import { MessageSquare, Search } from "lucide-react";

type SuggestionItem = {
  id: number;
  title: string;
  content: string;
  category: string;
  isAnonymous: boolean;
  userName: string;
  status: string;
  hrNote: string | null;
  createdAt: string;
};

interface Props {
  initialSuggestions: SuggestionItem[];
}

export default function HRSuggestionsClient({ initialSuggestions }: Props) {
  const router = useRouter();
  const [suggestions] = useState(initialSuggestions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [hrNote, setHrNote] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = suggestions.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchSearch && matchStatus;
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

  const handleReview = async (id: number, status: "IN_REVIEW" | "ACTIONED" | "CLOSED") => {
    setLoading(true);
    try {
      await reviewSuggestion(id, status, hrNote || undefined);
      setReviewingId(null);
      setHrNote("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const statuses = ["ALL", "OPEN", "IN_REVIEW", "ACTIONED", "CLOSED"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-[#c91f41]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suggestions Box</h1>
          <p className="text-sm text-gray-500">{suggestions.filter((s) => s.status === "OPEN").length} open</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${statusFilter === s ? "bg-[#c91f41] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{s.title}</h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[s.category]}`}>{s.category}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[s.status]}`}>{s.status.replace("_", " ")}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">by {s.userName} &middot; {new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{s.content}</p>
            {s.hrNote && <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">HR Note: {s.hrNote}</p>}

            {s.status !== "CLOSED" && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {reviewingId === s.id ? (
                  <div className="space-y-2">
                    <input type="text" placeholder="Add a note..." value={hrNote} onChange={(e) => setHrNote(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]" />
                    <div className="flex items-center gap-2">
                      {s.status === "OPEN" && (
                        <button onClick={() => handleReview(s.id, "IN_REVIEW")} disabled={loading}
                          className="px-2 py-1 text-xs font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 disabled:opacity-50">Mark In Review</button>
                      )}
                      <button onClick={() => handleReview(s.id, "ACTIONED")} disabled={loading}
                        className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">Mark Actioned</button>
                      <button onClick={() => handleReview(s.id, "CLOSED")} disabled={loading}
                        className="px-2 py-1 text-xs font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600 disabled:opacity-50">Close</button>
                      <button onClick={() => { setReviewingId(null); setHrNote(""); }}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setReviewingId(s.id)}
                    className="px-3 py-1 text-xs font-medium text-[#c91f41] bg-[#fef2f4] rounded-lg hover:bg-red-100">Review</button>
                )}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No suggestions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
