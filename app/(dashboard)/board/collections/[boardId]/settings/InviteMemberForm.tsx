"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteCollectionBoardMember } from "@/app/actions/collectionBoardActions";

type InviteSuggestion = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type InviteMemberFormProps = {
  boardId: number;
  suggestions: InviteSuggestion[];
};

export default function InviteMemberForm({ boardId, suggestions }: InviteMemberFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const dataListId = `invite-user-emails-${useId().replace(/:/g, "")}`;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setFeedback({ type: "error", message: "Please enter an email address." });
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const result = await inviteCollectionBoardMember({ boardId, email: normalized });
        setFeedback({
          type: "success",
          message: result.message || "Invite processed successfully.",
        });
        setEmail("");
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Could not send invite.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-400 mb-2">
          Email
        </label>
        <input
          name="email"
          list={dataListId}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="person@5dm.africa"
          className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 text-sm font-semibold text-gray-900 dark:text-white"
        />

        <datalist id={dataListId}>
          {suggestions.map((person) => (
            <option key={person.id} value={person.email}>
              {person.name} ({person.role})
            </option>
          ))}
        </datalist>

        {suggestions.length > 0 ? (
          <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-zinc-500">
            Start typing to see active user suggestions.
          </p>
        ) : (
          <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-zinc-500">
            All active users are already on this board.
          </p>
        )}
      </div>

      {feedback ? (
        <div
          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 px-5 rounded-xl bg-[#c91f41] text-white text-sm font-black tracking-wide disabled:opacity-60"
      >
        {isPending ? "Sending..." : "Invite Member"}
      </button>
    </form>
  );
}
