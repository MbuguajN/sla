import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import SuggestionDetailClient from "./SuggestionDetailClient";

export default async function HRSuggestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const suggestionId = Number.parseInt(id, 10);

  if (Number.isNaN(suggestionId)) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.departmentSlug !== "human-resources") {
    redirect("/dashboard");
  }

  const suggestion = await db.suggestion.findUnique({
    where: { id: suggestionId },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!suggestion) {
    notFound();
  }

  return (
    <SuggestionDetailClient
      suggestion={{
        id: suggestion.id,
        title: suggestion.title,
        content: suggestion.content,
        category: suggestion.category,
        status: suggestion.status,
        isAnonymous: suggestion.isAnonymous,
        userName: suggestion.user.name,
        hrNote: suggestion.hrNote,
        createdAt: suggestion.createdAt.toISOString(),
        updatedAt: suggestion.updatedAt.toISOString(),
      }}
    />
  );
}
