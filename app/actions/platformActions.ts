"use server";

import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function getPlatformLinks() {
  return db.platformLink.findMany({ orderBy: { createdAt: "desc" } });
}

export async function addPlatformLink(name: string, url: string) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("Only admins can add platform links");

  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  const link = await db.platformLink.create({ data: { name: name.trim(), url: normalizedUrl } });
  revalidatePath("/");
  return link;
}

export async function deletePlatformLink(id: number) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("Only admins can delete platform links");

  await db.platformLink.delete({ where: { id } });
  revalidatePath("/");
}
