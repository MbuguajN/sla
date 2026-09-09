"use server";

import { db } from "@/lib/db";
import { getCurrentUser, canManageEmployeeDirectoryAccess } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function requireDirectoryAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!canManageEmployeeDirectoryAccess(user)) throw new Error("Unauthorized");
  return user;
}

export async function getEmployeesAccessList() {
  await requireDirectoryAdmin();

  const granted = await db.employeeDirectoryViewer.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, department: { select: { name: true } } },
      },
    },
  });

  return granted.map((g) => ({
    id: g.user.id,
    name: g.user.name,
    email: g.user.email,
    role: g.user.role,
    department: g.user.department?.name || null,
    grantId: g.id,
  }));
}

export async function grantEmployeesAccess(targetUserId: number) {
  const user = await requireDirectoryAdmin();

  const grant = await db.employeeDirectoryViewer.upsert({
    where: { userId: targetUserId },
    update: {},
    create: { userId: targetUserId, grantedById: user.id },
  });

  revalidatePath("/employees");
  return grant;
}

export async function revokeEmployeesAccess(targetUserId: number) {
  await requireDirectoryAdmin();

  await db.employeeDirectoryViewer.deleteMany({ where: { userId: targetUserId } });

  revalidatePath("/employees");
}

export async function searchUsersForAccess(query: string) {
  const user = await requireDirectoryAdmin();

  const users = await db.user.findMany({
    where: {
      isActive: true,
      id: { not: user.id },
      OR: query
        ? [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: { select: { name: true } },
      directoryViewAccess: { select: { id: true } },
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department?.name || null,
    hasAccess: Boolean(u.directoryViewAccess),
  }));
}
