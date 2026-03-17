"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return db.user.findUnique({
    where: { id: user.id },
    include: { department: true },
  });
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Verify old password
  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new Error("User not found");

  const oldPasswordValid = await bcrypt.compare(oldPassword, dbUser.password);
  if (!oldPasswordValid) throw new Error("Current password is incorrect");

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await db.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function updateProjectTitle(projectId: number, title: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { departments: { include: { department: true } } },
  });

  if (!project) throw new Error("Project not found");

  const project_updated = await db.project.update({
    where: { id: projectId },
    data: { title },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return project_updated;
}

export async function updateProjectDescription(
  projectId: number,
  description: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const project_updated = await db.project.update({
    where: { id: projectId },
    data: { description },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return project_updated;
}

export async function updateClientName(clientId: number, name: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const client_updated = await db.client.update({
    where: { id: clientId },
    data: { name },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return client_updated;
}

export async function updateClientDescription(
  clientId: number,
  description: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const client_updated = await db.client.update({
    where: { id: clientId },
    data: { description },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return client_updated;
}
