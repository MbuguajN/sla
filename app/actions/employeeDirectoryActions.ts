"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function getEmployeesAccessList() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const isAdmin = user.role === "ADMIN" || user.role === "CEO" || user.departmentSlug === "human-resources";
  if (!isAdmin) throw new Error("Unauthorized");

  const granted = await db.userPrivilege.findMany({
    where: { privilege: "CAN_VIEW_EMPLOYEES" },
    include: { user: { select: { id: true, name: true, email: true, role: true, department: { select: { name: true } } } } },
  });

  return granted.map((g) => ({
    id: g.user.id,
    name: g.user.name,
    email: g.user.email,
    role: g.user.role,
    department: g.user.department?.name || null,
    privilegeId: g.id,
  }));
}

export async function grantEmployeesAccess(targetUserId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const isAdmin = user.role === "ADMIN" || user.role === "CEO" || user.departmentSlug === "human-resources";
  if (!isAdmin) throw new Error("Unauthorized");

  const existing = await db.userPrivilege.findUnique({
    where: { userId_privilege: { userId: targetUserId, privilege: "CAN_VIEW_EMPLOYEES" } },
  });

  if (existing) return existing;

  const privilege = await db.userPrivilege.create({
    data: {
      userId: targetUserId,
      privilege: "CAN_VIEW_EMPLOYEES",
      grantedById: user.id,
    },
  });

  revalidatePath("/employees");
  return privilege;
}

export async function revokeEmployeesAccess(targetUserId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const isAdmin = user.role === "ADMIN" || user.role === "CEO" || user.departmentSlug === "human-resources";
  if (!isAdmin) throw new Error("Unauthorized");

  await db.userPrivilege.deleteMany({
    where: {
      userId: targetUserId,
      privilege: "CAN_VIEW_EMPLOYEES",
    },
  });

  revalidatePath("/employees");
}

export async function searchUsersForAccess(query: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const isAdmin = user.role === "ADMIN" || user.role === "CEO" || user.departmentSlug === "human-resources";
  if (!isAdmin) throw new Error("Unauthorized");

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
      heldPrivileges: {
        where: { privilege: "CAN_VIEW_EMPLOYEES" },
        select: { id: true },
      },
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
    hasAccess: u.heldPrivileges.length > 0,
  }));
}
