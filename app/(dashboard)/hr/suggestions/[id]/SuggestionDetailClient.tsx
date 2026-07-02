"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewSuggestion } from "@/app/actions/hrActions";
import { ArrowLeft, Clock3 } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import {
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
  updatedAt: string;
};

interface Props {
  suggestion: SuggestionDetail;
}

const statusLabel: Record<string, string> = {
  OPEN: "Open",
  IN_REVIEW: "In Review",
  ACTIONED: "Actioned",
  CLOSED: "Closed",
};

export default function SuggestionDetailClient({ suggestion }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(suggestion.status);
  const [hrNote, setHrNote] = useState(suggestion.hrNote ?? "");
  const [loading, setLoading] = useState(false);

  const submittedDate = new Date(suggestion.createdAt);
  const updatedDate = new Date(suggestion.updatedAt);
  const lastUpdatedLabel =
    Math.max(1, Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60))) + "h ago";

  const submittedLabel = submittedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
    <div className="mx-auto max-w-6xl space-y-6 bg-[#f5f7fb] px-2 py-2 sm:px-0">
      <div>
        <Link
          href="/hr/suggestions"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#c91f41]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suggestions
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ffe8ec] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#cc1f45]">
              {suggestion.category}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 border border-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {statusLabel[status] || status.replace("_", " ")}
            </span>
          </div>

          <h1 className="mt-3 text-[34px] leading-[1.08] font-black tracking-[-0.02em] text-[#0b2340]">{suggestion.title}</h1>

          <div className="mt-10 space-y-8">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Author</p>
              <p className="mt-1.5 text-[14px] font-medium text-[#0b2340]">{suggestion.isAnonymous ? "Anonymous" : suggestion.userName}</p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Submission Date</p>
              <p className="mt-1.5 text-[14px] font-medium text-[#0b2340]">{submittedLabel}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-8">
          <Card className="rounded-2xl border border-slate-200/80 bg-[#f9fafc] shadow-none">
            <CardBody className="p-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c91f41]">Statement</p>
              <div className="mt-3 text-[22px] leading-[1.35] text-[#233b57]">
                <MarkdownRenderer content={suggestion.content} className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
              </div>
            </CardBody>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 bg-[#f9fafc] shadow-none">
            <CardBody className="p-7 space-y-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c91f41]">HR Remarks</p>

              <Textarea
                rows={6}
                placeholder="Enter administrative notes or internal feedback here..."
                value={hrNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHrNote(e.target.value)}
                className="h-[136px] w-full rounded-xl border-slate-200 bg-[#f4f6fb] !px-4 !py-3.5 text-[14px] leading-5 text-[#24344b] placeholder:text-[#93a1b7]"
              />

              <p className="-mt-3 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Internal only</p>

              <div className="border-t border-slate-200 pt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-start gap-2 text-[11px] text-slate-500">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#dfe6f3] text-[10px] font-bold text-slate-700">
                    A
                  </div>
                  <div className="leading-tight">
                    <p>Last updated by</p>
                    <p className="font-semibold text-slate-700">Admin</p>
                    <p className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {lastUpdatedLabel}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Button
                    onClick={() => handleReview("IN_REVIEW")}
                    disabled={loading || status === "IN_REVIEW"}
                    size="sm"
                    variant="outline"
                    className="!h-9 !min-h-9 !rounded-full !border-[#c8d8f4] !bg-[#e9f1ff] !px-4 !text-[13px] !font-bold !normal-case !leading-none !text-[#2a4f85] hover:!bg-[#dfeafd]"
                  >
                    Mark In Review
                  </Button>
                  <Button
                    onClick={() => handleReview("ACTIONED")}
                    disabled={loading || status === "ACTIONED"}
                    size="sm"
                    variant="outline"
                    className="!h-9 !min-h-9 !rounded-full !border-[#cf2749] !bg-[#cf2749] !px-4 !text-[13px] !font-bold !normal-case !leading-none !text-white hover:!bg-[#b91d3d]"
                  >
                    Mark Actioned
                  </Button>
                  <Button
                    onClick={() => handleReview("CLOSED")}
                    disabled={loading || status === "CLOSED"}
                    size="sm"
                    variant="ghost"
                    className="!h-9 !min-h-9 !rounded-full !bg-transparent !px-1 !text-[13px] !font-bold !normal-case !leading-none !text-[#0b2340] hover:!bg-slate-100"
                  >
                    Close Suggestion
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
