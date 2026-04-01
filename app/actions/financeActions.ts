"use server";

import { db } from "@/lib/db";
import {
  getCurrentUser,
  canViewFinanceData,
  canManageRefunds,
  canApproveRequisitionAsFinance,
  canApproveRequisitionAsCEO,
  DEPARTMENTS,
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";

// Helper: Notify all Finance department users
async function notifyFinanceDepartment(title: string, message: string, link?: string) {
  const financeUsers = await db.user.findMany({
    where: {
      OR: [
        { role: "ADMIN" },
        { role: "CEO" },
        { department: { slug: DEPARTMENTS.FINANCE } },
      ],
    },
  });

  for (const user of financeUsers) {
    await createNotification(user.id, "REQUISITION_SUBMITTED", title, message, link);
  }
}

// Helper: Notify all CEO users
async function notifyCEO(title: string, message: string, link?: string) {
  const ceoUsers = await db.user.findMany({
    where: {
      role: { in: ["ADMIN", "CEO"] },
    },
  });

  for (const user of ceoUsers) {
    await createNotification(user.id, "REQUISITION_SUBMITTED", title, message, link);
  }
}

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

export async function getPendingRequisitionsForFinance() {
  const user = await getCurrentUser();
  if (!user || !canApproveRequisitionAsFinance(user)) throw new Error("Unauthorized");

  return db.requisition.findMany({
    where: { status: "PENDING_FINANCE" },
    include: {
      user: { include: { department: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingRequisitionsForCEO() {
  const user = await getCurrentUser();
  if (!user || !canApproveRequisitionAsCEO(user)) throw new Error("Unauthorized");

  return db.requisition.findMany({
    where: { status: "PENDING_CEO" },
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

  const totalAmount = data.items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice;
    return sum + (item.vatInclusive ? lineTotal * 1.16 : lineTotal);
  }, 0);

  const requisition = await db.requisition.create({
    data: {
      userId: user.id,
      title: data.title,
      reason: data.reason,
      totalAmount,
      status: "PENDING_FINANCE",
      items: {
        create: data.items.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatInclusive: item.vatInclusive,
        })),
      },
    },
    include: { items: true, user: { include: { department: true } } },
  });

  // Notify Finance department
  await notifyFinanceDepartment(
    "New Requisition Submitted",
    `${requisition.user.name} has submitted a requisition for KES ${requisition.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    "/finance/requisitions"
  );

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return requisition;
}

// Finance submits requisition for CEO approval
export async function submitRequisitionForApproval(reqId: number, note?: string) {
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

  const updated = await db.requisition.update({
    where: { id: reqId },
    data: {
      status: "PENDING_CEO",
      financeNote: note || null,
    },
    include: { user: true },
  });

  // Notify CEO that requisition is pending their approval
  await notifyCEO(
    "Requisition Pending CEO Approval",
    `${requisition.user.name} has a requisition for KES ${requisition.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending your approval`,
    "/admin"
  );

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return updated;
}

// Finance rejects requisition
export async function rejectRequisitionAsFinance(reqId: number, note: string) {
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

  const updated = await db.requisition.update({
    where: { id: reqId },
    data: {
      status: "DENIED",
      financeNote: note,
    },
  });

  // Notify requester that requisition was rejected
  await createNotification(
    requisition.userId,
    "REQUISITION_DENIED",
    "Requisition Rejected",
    `Your requisition has been rejected by Finance. Reason: ${note}`,
    "/requisitions"
  );

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return updated;
}

// CEO approves requisition
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

  // Notify requester that requisition was approved
  await createNotification(
    requisition.userId,
    "REQUISITION_APPROVED",
    "Requisition Approved",
    `Your requisition for KES ${requisition.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been approved by CEO`,
    "/requisitions"
  );

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return updated;
}

// CEO rejects requisition
export async function rejectRequisitionAsCEO(reqId: number, note: string) {
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
      status: "DENIED",
      ceoNote: note,
    },
  });

  // Notify requester and finance that requisition was rejected
  await createNotification(
    requisition.userId,
    "REQUISITION_DENIED",
    "Requisition Rejected",
    `Your requisition has been rejected by CEO. Reason: ${note}`,
    "/requisitions"
  );

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

export async function getPendingRefundsForFinance() {
  const user = await getCurrentUser();
  if (!user || !canManageRefunds(user)) throw new Error("Unauthorized");

  return db.refund.findMany({
    where: { status: "PENDING_FINANCE" },
    include: { user: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingRefundsForCEO() {
  const user = await getCurrentUser();
  if (!user || !canApproveRequisitionAsCEO(user)) throw new Error("Unauthorized");

  return db.refund.findMany({
    where: { status: "PENDING_CEO" },
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
      status: "PENDING_FINANCE",
    },
    include: { user: { include: { department: true } } },
  });

  // Notify Finance department
  await notifyFinanceDepartment(
    "New Refund Request Submitted",
    `${user.name} has submitted a refund request for KES ${refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    "/finance/refunds"
  );

  revalidatePath("/refunds");
  revalidatePath("/finance/refunds");
  return refund;
}

// Finance submits refund for CEO approval
export async function submitRefundForApproval(refundId: number, note?: string) {
  const user = await getCurrentUser();
  if (!user || !canManageRefunds(user)) throw new Error("Unauthorized");

  const refund = await db.refund.findUnique({
    where: { id: refundId },
    include: { user: true },
  });
  if (!refund) throw new Error("Refund not found");
  if (refund.status !== "PENDING_FINANCE") throw new Error("Not pending finance approval");

  const updated = await db.refund.update({
    where: { id: refundId },
    data: {
      status: "PENDING_CEO",
      financeNote: note || null,
    },
    include: { user: true },
  });

  // Notify CEO that refund is pending their approval
  await notifyCEO(
    "Refund Pending CEO Approval",
    `${refund.user.name} has a refund request for KES ${refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending your approval`,
    "/admin"
  );

  revalidatePath("/refunds");
  revalidatePath("/finance/refunds");
  return updated;
}

// Finance rejects refund
export async function rejectRefundAsFinance(refundId: number, note: string) {
  const user = await getCurrentUser();
  if (!user || !canManageRefunds(user)) throw new Error("Unauthorized");

  const refund = await db.refund.findUnique({
    where: { id: refundId },
    include: { user: true },
  });
  if (!refund) throw new Error("Refund not found");
  if (refund.status !== "PENDING_FINANCE") throw new Error("Not pending finance approval");

  const updated = await db.refund.update({
    where: { id: refundId },
    data: {
      status: "DENIED",
      financeNote: note,
    },
  });

  // Notify requester that refund was rejected
  await createNotification(
    refund.userId,
    "REFUND_DENIED",
    "Refund Rejected",
    `Your refund request has been rejected by Finance. Reason: ${note}`,
    "/refunds"
  );

  revalidatePath("/refunds");
  revalidatePath("/finance/refunds");
  return updated;
}

// CEO approves refund
export async function approveRefundAsCEO(refundId: number, note?: string) {
  const user = await getCurrentUser();
  if (!user || !canApproveRequisitionAsCEO(user)) {
    throw new Error("Unauthorized");
  }

  const refund = await db.refund.findUnique({
    where: { id: refundId },
    include: { user: true },
  });
  if (!refund) throw new Error("Refund not found");
  if (refund.status !== "PENDING_CEO") throw new Error("Not pending CEO approval");

  const updated = await db.refund.update({
    where: { id: refundId },
    data: {
      status: "APPROVED",
      ceoNote: note || null,
    },
  });

  // Notify requester that refund was approved
  await createNotification(
    refund.userId,
    "REFUND_APPROVED",
    "Refund Approved",
    `Your refund request for KES ${refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been approved by CEO`,
    "/refunds"
  );

  revalidatePath("/refunds");
  revalidatePath("/finance/refunds");
  return updated;
}

// CEO rejects refund
export async function rejectRefundAsCEO(refundId: number, note: string) {
  const user = await getCurrentUser();
  if (!user || !canApproveRequisitionAsCEO(user)) {
    throw new Error("Unauthorized");
  }

  const refund = await db.refund.findUnique({
    where: { id: refundId },
    include: { user: true },
  });
  if (!refund) throw new Error("Refund not found");
  if (refund.status !== "PENDING_CEO") throw new Error("Not pending CEO approval");

  const updated = await db.refund.update({
    where: { id: refundId },
    data: {
      status: "DENIED",
      ceoNote: note,
    },
  });

  // Notify requester that refund was rejected
  await createNotification(
    refund.userId,
    "REFUND_DENIED",
    "Refund Rejected",
    `Your refund request has been rejected by CEO. Reason: ${note}`,
    "/refunds"
  );

  revalidatePath("/refunds");
  revalidatePath("/finance/refunds");
  return updated;
}
