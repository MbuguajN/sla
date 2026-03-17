import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import SuggestionsClient from "./SuggestionsClient";

export default async function SuggestionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const suggestions = await db.suggestion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SuggestionsClient
      initialSuggestions={suggestions.map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        category: s.category,
        isAnonymous: s.isAnonymous,
        status: s.status,
        hrNote: s.hrNote,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
