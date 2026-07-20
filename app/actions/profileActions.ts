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
    include: {
      department: true,
      equipmentOwned: {
        select: {
          id: true,
          make: true,
          model: true,
          serialNumber: true,
        },
        orderBy: { createdAt: "desc" },
      },
      personalDocuments: {
        orderBy: { createdAt: "desc" },
      },
    },
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

export async function addPersonalDocument(name: string, url: string, category: string = "General", accessLevel: string = "Restricted") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const doc = await db.personalDocument.create({
    data: { userId: user.id, name, url, category, accessLevel },
  });

  revalidatePath("/profile");
  revalidatePath("/employees");
  return doc;
}

export async function updatePersonalDocument(docId: number, data: { name?: string; category?: string; accessLevel?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const doc = await db.personalDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.userId !== user.id) throw new Error("Not found");

  const updated = await db.personalDocument.update({
    where: { id: docId },
    data,
  });

  revalidatePath("/profile");
  revalidatePath("/employees");
  return updated;
}

export async function deletePersonalDocument(docId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const doc = await db.personalDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.userId !== user.id) throw new Error("Not found");

  await db.personalDocument.delete({ where: { id: docId } });
  revalidatePath("/profile");
  revalidatePath("/employees");
}

export async function updatePersonalInfo(data: {
  employmentDate?: string | null;
  maritalStatus?: string | null;
  gender?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.user.update({
    where: { id: user.id },
    data: {
      ...(data.employmentDate !== undefined && { employmentDate: data.employmentDate ? new Date(data.employmentDate) : null }),
      ...(data.maritalStatus !== undefined && { maritalStatus: data.maritalStatus }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
      ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName }),
      ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone }),
      ...(data.emergencyContactRelation !== undefined && { emergencyContactRelation: data.emergencyContactRelation }),
    },
  });

  revalidatePath("/profile");
  revalidatePath("/employees");
}

export async function updateUserLeaveOverride(targetUserId: number, leaveType: string, daysAllowed: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const isHr = user.role === "ADMIN" || user.departmentSlug === "human-resources";
  if (!isHr) throw new Error("Unauthorized - Only HR can adjust leave days");

  if (daysAllowed < 0) throw new Error("Days allowed cannot be negative");

  await db.userLeaveOverride.upsert({
    where: { userId_leaveType: { userId: targetUserId, leaveType: leaveType as any } },
    update: { daysAllowed },
    create: { userId: targetUserId, leaveType: leaveType as any, daysAllowed },
  });

  revalidatePath("/profile");
  revalidatePath("/employees");
}
