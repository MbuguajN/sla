"use server"

import prisma from "@/lib/db"
import { getCurrentUser } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─── Validation ───

const createSuggestionSchema = z.object({
  category: z.enum(["COMPLAINT", "SUGGESTION", "FEEDBACK", "REQUEST"]),
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  isAnonymous: z.boolean().default(true),
})

// ─── Create Suggestion ───
export async function createSuggestion(data: {
  category: string
  title: string
  content: string
  isAnonymous?: boolean
}) {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  const parsed = createSuggestionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" }
  }

  try {
    const suggestion = await prisma.suggestion.create({
      data: {
        userId: user.id,
        category: parsed.data.category as "COMPLAINT" | "SUGGESTION" | "FEEDBACK" | "REQUEST",
        title: parsed.data.title,
        content: parsed.data.content,
        isAnonymous: parsed.data.isAnonymous ?? true,
        status: "OPEN",
      },
    })

    revalidatePath("/suggestions")
    revalidatePath("/hr/suggestions")
    return { success: true, suggestionId: suggestion.id }
  } catch (error) {
    console.error("Create suggestion error:", error)
    return { error: "Failed to create suggestion" }
  }
}

// ─── Get My Suggestions ───
export async function getMySuggestions() {
  const user = await getCurrentUser()
  if (!user) return []

  return prisma.suggestion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })
}

// ─── Get All Suggestions (HR/Admin) ───
export async function getAllSuggestions(filters?: { status?: string; category?: string }) {
  const user = await getCurrentUser()
  if (!user) return []

  if (!["ADMIN", "CEO"].includes(user.role) && user.departmentSlug !== "human-resources") {
    return []
  }

  const where: Record<string, unknown> = {}
  if (filters?.status) where.status = filters.status
  if (filters?.category) where.category = filters.category

  return prisma.suggestion.findMany({
    where,
    include: {
      user: { select: { name: true, department: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })
}

// ─── Update Suggestion Status (HR/Admin) ───
export async function updateSuggestion(
  id: number,
  data: { status?: string; hrNote?: string }
) {
  const user = await getCurrentUser()
  if (!user) return { error: "Unauthorized" }

  if (!["ADMIN", "CEO"].includes(user.role) && user.departmentSlug !== "human-resources") {
    return { error: "Only HR/Admin can manage suggestions" }
  }

  try {
    await prisma.suggestion.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status as "OPEN" | "IN_REVIEW" | "ACTIONED" | "CLOSED" }),
        ...(data.hrNote !== undefined && { hrNote: data.hrNote }),
      },
    })

    revalidatePath("/hr/suggestions")
    revalidatePath("/suggestions")
    return { success: true }
  } catch (error) {
    console.error("Update suggestion error:", error)
    return { error: "Failed to update suggestion" }
  }
}
