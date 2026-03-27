"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reviewSuggestion } from "@/app/actions/hrActions";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Badge, Button, Input } from "@/components/daisy-components";

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

export default function SuggestionDetailClient({ suggestion }: { suggestion: SuggestionItem }) {
  const router = useRouter();
  const [hrNote, setHrNote] = useState(suggestion.hrNote || "");
  const [loading, setLoading] = useState(false);

  const categoryColors: Record<string, string> = {
    COMPLAINT: "bg-red-100 text-red-700",
    SUGGESTION: "bg-blue-100 text-blue-700",
    FEEDBACK: "bg-purple-100 text-purple-700",
    REQUEST: "bg-orange-100 text-orange-700",
  };

  const statusColors: Record<string, string> = {
    OPEN: "info",
    IN_REVIEW: "primary",
    ACTIONED: "success",
    CLOSED: "secondary",
  };

  const handleReview = async (status: "IN_REVIEW" | "ACTIONED" | "CLOSED") => {
    setLoading(true);
    try {
      await reviewSuggestion(suggestion.id, status, hrNote || undefined);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link href="/hr/suggestions" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#c91f41]">
          <ArrowLeft className="h-4 w-4" />
          Back to suggestions
        </Link>
      </div>

      <section className="rounded-3xl border border-gray-100 bg-white p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-[#fef2f4] rounded-xl">
                <MessageSquare className="h-4 w-4 text-[#c91f41]" />
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[suggestion.category] || "bg-gray-100 text-gray-700"}`}>
                {suggestion.category}
              </span>
              <Badge variant={statusColors[suggestion.status] || "secondary"}>{suggestion.status.replace("_", " ")}</Badge>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{suggestion.title}</h1>
            <p className="text-sm text-slate-500 mt-2">
              By {suggestion.userName} • {new Date(suggestion.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{suggestion.content}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-7">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Review Action</h2>
        <div className="mt-4 space-y-3">
          <Input
            type="text"
            placeholder="Add a note..."
            value={hrNote}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHrNote(e.target.value)}
            className="w-full h-10 rounded-xl border-gray-200 bg-white"
          />

          <div className="flex flex-wrap items-center gap-2">
            {suggestion.status === "OPEN" && (
              <Button onClick={() => handleReview("IN_REVIEW")} disabled={loading} size="sm" variant="primary" className="rounded-xl font-bold">
                Mark In Review
              </Button>
            )}
            <Button onClick={() => handleReview("ACTIONED")} disabled={loading} size="sm" variant="success" className="rounded-xl font-bold">
              Mark Actioned
            </Button>
            <Button onClick={() => handleReview("CLOSED")} disabled={loading} size="sm" variant="outline" className="rounded-xl border-gray-300 font-bold">
              Close
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
