"use server";

import { db } from "@/lib/db";
import {
  getCurrentUser,
  canViewFinanceData,
  canManageRefunds,
  canApproveRequisitionAsManager,
  canApproveRequisitionAsFinance,
  canApproveRequisitionAsCEO,
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";

// ============== REQUISITIONS ==============

export async function getMyRequisitions() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return db.requisition.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllRequisitions() {
  const user = await getCurrentUser();
  if (!user || !canViewFinanceData(user)) throw new Error("Unauthorized");

  return db.requisition.findMany({
    include: {
      user: { include: { department: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingRequisitionsForManager() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MANAGER") throw new Error("Unauthorized");

  // Get requisitions from team members pending manager approval
  return db.requisition.findMany({
    where: {
      status: "PENDING_MANAGER",
      user: { departmentId: user.departmentId },
    },
    include: {
      user: { include: { department: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createRequisition(data: {
  title: string;
  reason: string;
  items: { itemName: string; quantity: number; unitPrice: number; vatInclusive: boolean }[];
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const totalAmount = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const requisition = await db.requisition.create({
    data: {
      userId: user.id,
      title: data.title,
      reason: data.reason,
      totalAmount,
      status: "PENDING_MANAGER",
      items: {
        create: data.items.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatInclusive: item.vatInclusive,
        })),
      },
    },
    include: { items: true },
  });

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return requisition;
}

// Manager approves → goes to Finance
export async function approveRequisitionAsManager(reqId: number, note?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const requisition = await db.requisition.findUnique({
    where: { id: reqId },
    include: { user: true },
  });

  if (!requisition) throw new Error("Requisition not found");
  if (requisition.status !== "PENDING_MANAGER") throw new Error("Not pending manager approval");

  if (!canApproveRequisitionAsManager(user, requisition.user.departmentId)) {
    throw new Error("Unauthorized - not the manager for this department");
  }

  const updated = await db.requisition.update({
    where: { id: reqId },
    data: {
      status: "PENDING_FINANCE",
      managerNote: note || null,
    },
  });

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return updated;
}

// Finance approves → goes to CEO (if above threshold) or approved
export async function approveRequisitionAsFinance(reqId: number, note?: string) {
  const user = await getCurrentUser();
  if (!user || !canApproveRequisitionAsFinance(user)) {
    throw new Error("Unauthorized");
  }

  const requisition = await db.requisition.findUnique({
    where: { id: reqId },
    include: { user: true },
  });
  if (!requisition) throw new Error("Requisition not found");
  if (requisition.status !== "PENDING_FINANCE") throw new Error("Not pending finance approval");

  // Check threshold for CEO approval
  const thresholdSetting = await db.systemSetting.findUnique({
    where: { key: "requisition_ceo_threshold" },
  });
  const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 10000;

  const newStatus =
    requisition.totalAmount >= threshold ? "PENDING_CEO" : "APPROVED";

  const updated = await db.requisition.update({
    where: { id: reqId },
    data: {
      status: newStatus,
      financeNote: note || null,
    },
    include: { user: true },
  });

  // Create notification
  if (newStatus === "APPROVED") {
    await createNotification(
      requisition.userId,
      "REQUISITION_APPROVED",
      "Requisition Approved",
      `Your requisition for R${requisition.totalAmount} has been approved`,
      "/requisitions"
    );
  } else {
    await createNotification(
      requisition.userId,
      "REQUISITION_UPDATED",
      "Requisition Update",
      `Your requisition is now pending CEO approval`,
      "/requisitions"
    );
  }

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return updated;
}

// CEO final approval
export async function approveRequisitionAsCEO(reqId: number, note?: string) {
  const user = await getCurrentUser();
  if (!user || !canApproveRequisitionAsCEO(user)) {
    throw new Error("Unauthorized");
  }

  const requisition = await db.requisition.findUnique({
    where: { id: reqId },
    include: { user: true },
  });
  if (!requisition) throw new Error("Requisition not found");
  if (requisition.status !== "PENDING_CEO") throw new Error("Not pending CEO approval");

  const updated = await db.requisition.update({
    where: { id: reqId },
    data: {
      status: "APPROVED",
      ceoNote: note || null,
    },
  });

  // Create notification
  await createNotification(
    requisition.userId,
    "REQUISITION_APPROVED",
    "Requisition Approved",
    `Your requisition for R${requisition.totalAmount} has been approved by CEO`,
    "/requisitions"
  );

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return updated;
}

// Deny requisition at any stage
export async function denyRequisition(reqId: number, note: string, stage: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const requisition = await db.requisition.findUnique({
    where: { id: reqId },
    include: { user: true },
  });

  if (!requisition) throw new Error("Requisition not found");

  // Verify authority at current stage
  if (requisition.status === "PENDING_MANAGER") {
    if (!canApproveRequisitionAsManager(user, requisition.user.departmentId)) {
      throw new Error("Unauthorized");
    }
  } else if (requisition.status === "PENDING_FINANCE") {
    if (!canApproveRequisitionAsFinance(user)) throw new Error("Unauthorized");
  } else if (requisition.status === "PENDING_CEO") {
    if (!canApproveRequisitionAsCEO(user)) throw new Error("Unauthorized");
  } else {
    throw new Error("Cannot deny at this stage");
  }

  const noteField =
    requisition.status === "PENDING_MANAGER"
      ? "managerNote"
      : requisition.status === "PENDING_FINANCE"
      ? "financeNote"
      : "ceoNote";

  const updated = await db.requisition.update({
    where: { id: reqId },
    data: {
      status: "DENIED",
      [noteField]: note,
    },
  });

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return updated;
}

// ============== REFUNDS ==============

export async function getMyRefunds() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return db.refund.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllRefunds() {
  const user = await getCurrentUser();
  if (!user || !canManageRefunds(user)) throw new Error("Unauthorized");

  return db.refund.findMany({
    include: { user: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createRefund(data: { amount: number; reason: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const refund = await db.refund.create({
    data: {
      userId: user.id,
      amount: data.amount,
      reason: data.reason,
      status: "PENDING",
    },
  });

  revalidatePath("/refunds");
  revalidatePath("/finance/refunds");
  return refund;
}

export async function reviewRefund(
  refundId: number,
  decision: "APPROVED" | "DENIED",
  financeNote?: string
) {
  const user = await getCurrentUser();
  if (!user || !canManageRefunds(user)) throw new Error("Unauthorized");

  const refund = await db.refund.update({
    where: { id: refundId },
    data: {
      status: decision,
      financeNote: financeNote || null,
    },
  });

  revalidatePath("/refunds");
  revalidatePath("/finance/refunds");
  return refund;
}
