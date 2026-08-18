"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canManageEquipment, getCurrentUser } from "@/lib/permissions";
import { EquipmentStatus } from "@prisma/client";

function requireAdminRole(role: string) {
  if (!canManageEquipment({ role })) {
    throw new Error("Unauthorized");
  }
}

export async function createEquipmentCategory(name: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  requireAdminRole(user.role);

  const cleaned = name.trim();
  if (!cleaned) throw new Error("Category name is required");

  const category = await db.equipmentCategory.create({
    data: { name: cleaned },
  });

  revalidatePath("/equipment");
  return category;
}

export async function createEquipmentItem(data: {
  categoryId: number;
  make: string;
  model: string;
  status: EquipmentStatus;
  serialNumber?: string | null;
  ownerUserId?: number | null;
  ownerLabel?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  requireAdminRole(user.role);

  const make = data.make.trim();
  const model = data.model.trim();
  if (!make || !model) throw new Error("Make and model are required");

  const item = await db.equipmentItem.create({
    data: {
      categoryId: data.categoryId,
      make,
      model,
      status: data.status,
      serialNumber: data.serialNumber?.trim() || null,
      ownerUserId: data.ownerUserId ?? null,
      ownerLabel: (data.ownerLabel || "5DM").trim() || "5DM",
    },
  });

  revalidatePath("/equipment");
  return item;
}

export async function updateEquipmentItem(
  itemId: number,
  data: {
    categoryId: number;
    make: string;
    model: string;
    status: EquipmentStatus;
    serialNumber?: string | null;
    ownerUserId?: number | null;
    ownerLabel?: string;
  }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  requireAdminRole(user.role);

  const make = data.make.trim();
  const model = data.model.trim();
  if (!make || !model) throw new Error("Make and model are required");

  const item = await db.equipmentItem.update({
    where: { id: itemId },
    data: {
      categoryId: data.categoryId,
      make,
      model,
      status: data.status,
      serialNumber: data.serialNumber?.trim() || null,
      ownerUserId: data.ownerUserId ?? null,
      ownerLabel: (data.ownerLabel || "5DM").trim() || "5DM",
    },
  });

  revalidatePath("/equipment");
  return item;
}

export async function deleteEquipmentItem(itemId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  requireAdminRole(user.role);

  await db.equipmentItem.delete({ where: { id: itemId } });

  revalidatePath("/equipment");
}

export async function addEquipmentViewer(userId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  requireAdminRole(user.role);

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });

  if (!target || !target.isActive) {
    throw new Error("User not found or inactive");
  }

  await db.equipmentViewer.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      grantedById: user.id,
    },
  });

  revalidatePath("/equipment");
}

export async function removeEquipmentViewer(userId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  requireAdminRole(user.role);

  await db.equipmentViewer.deleteMany({ where: { userId } });

  revalidatePath("/equipment");
}

export async function setEquipmentSpecs(itemId: number, specs: { specType: string; specValue: string }[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  requireAdminRole(user.role);

  await db.equipmentSpec.deleteMany({ where: { equipmentItemId: itemId } });

  if (specs.length > 0) {
    await db.equipmentSpec.createMany({
      data: specs.map((s) => ({
        equipmentItemId: itemId,
        specType: s.specType.trim(),
        specValue: s.specValue.trim(),
      })),
    });
  }

  revalidatePath("/equipment");
}
