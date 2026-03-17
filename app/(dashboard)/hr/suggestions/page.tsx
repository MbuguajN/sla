import { redirect } from "next/navigation";
import { getCurrentUser, canViewSuggestions } from "@/lib/permissions";
import { db } from "@/lib/db";
import HRSuggestionsClient from "./HRSuggestionsClient";

export default async function HRSuggestionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewSuggestions(user)) redirect("/dashboard");

  const suggestions = await db.suggestion.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <HRSuggestionsClient
      initialSuggestions={suggestions.map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        category: s.category,
        isAnonymous: s.isAnonymous,
        userName: s.isAnonymous ? "Anonymous" : s.user.name,
        status: s.status,
        hrNote: s.hrNote,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
