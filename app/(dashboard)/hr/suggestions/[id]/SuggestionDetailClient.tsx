"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewSuggestion } from "@/app/actions/hrActions";
import { cn } from "@/lib/utils";
import { ArrowLeft, MessageSquare } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Textarea,
} from "@/components/daisy-components";

type SuggestionDetail = {
  id: number;
  title: string;
  content: string;
  category: string;
  status: string;
  isAnonymous: boolean;
  userName: string;
  hrNote: string | null;
  createdAt: string;
};

interface Props {
  suggestion: SuggestionDetail;
}

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

export default function SuggestionDetailClient({ suggestion }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(suggestion.status);
  const [hrNote, setHrNote] = useState(suggestion.hrNote ?? "");
  const [loading, setLoading] = useState(false);

  const handleReview = async (nextStatus: "IN_REVIEW" | "ACTIONED" | "CLOSED") => {
    setLoading(true);
    try {
      await reviewSuggestion(suggestion.id, nextStatus, hrNote || undefined);
      setStatus(nextStatus);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update suggestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/hr/suggestions"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#c91f41] hover:text-[#b31c3a]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suggestions
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-3xl bg-white border border-gray-100 p-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-[#fef2f4] rounded-xl">
              <MessageSquare className="h-4 w-4 text-[#c91f41]" />
            </div>
            <span className="text-[11px] font-black text-[#c91f41] uppercase tracking-[0.2em]">Culture Lab</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">{suggestion.title}</h1>
          <p className="text-sm text-gray-500 mt-2">Review and close the feedback loop with clear status updates and notes.</p>
        </div>
        <div className="xl:col-span-4 rounded-3xl bg-white border border-gray-100 p-6 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Status</p>
            <div className="mt-2">
              <Badge variant={statusColors[status] || "secondary"}>{status.replace("_", " ")}</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Category</p>
            <span className={cn("inline-flex mt-2 px-2 py-0.5 text-xs font-medium rounded-full", categoryColors[suggestion.category] || "bg-gray-100 text-gray-700")}>
              {suggestion.category}
            </span>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Author</p>
            <p className="mt-2 text-sm text-gray-700">{suggestion.isAnonymous ? "Anonymous" : suggestion.userName}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Submitted</p>
            <p className="mt-2 text-sm text-gray-700">{new Date(suggestion.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </section>

      <Card className="rounded-3xl border border-gray-100 shadow-none">
        <CardBody className="p-7 space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Suggestion Details</p>
            <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{suggestion.content}</p>
          </div>

          {suggestion.hrNote && (
            <div className="rounded-2xl border border-[#f0c8d2] bg-[#fff7f9] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#c91f41]">Current HR Note</p>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{suggestion.hrNote}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="rounded-3xl border border-gray-100 shadow-none">
        <CardBody className="p-7 space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Review Actions</p>
          <Textarea
            rows={4}
            placeholder="Add or update HR note"
            value={hrNote}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHrNote(e.target.value)}
            className="w-full rounded-xl border-gray-200 bg-white"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handleReview("IN_REVIEW")}
              disabled={loading || status === "IN_REVIEW"}
              size="sm"
              variant="primary"
              className="rounded-xl font-bold"
            >
              Mark In Review
            </Button>
            <Button
              onClick={() => handleReview("ACTIONED")}
              disabled={loading || status === "ACTIONED"}
              size="sm"
              variant="success"
              className="rounded-xl font-bold"
            >
              Mark Actioned
            </Button>
            <Button
              onClick={() => handleReview("CLOSED")}
              disabled={loading || status === "CLOSED"}
              size="sm"
              variant="outline"
              className="rounded-xl border-gray-300 font-bold"
            >
              Close
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
