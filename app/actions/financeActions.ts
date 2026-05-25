"use server";

import { db } from "@/lib/db";
import {
  getCurrentUser,
  canViewFinanceData,
  canManageRefunds,
  canApproveRequisitionAsManager,
  canApproveRequisitionAsFinance,
  canApproveRequisitionAsCEO,
  DEPARTMENTS,
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";

const MAX_REFUND_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_REFUND_RECEIPT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".pdf", ".webp"]);
const ALLOWED_REFUND_RECEIPT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
  "image/webp",
]);

async function persistRefundReceipt(file: File, userId: number) {
  if (file.size <= 0) {
    throw new Error("Receipt file is empty");
  }

  if (file.size > MAX_REFUND_RECEIPT_SIZE_BYTES) {
    throw new Error("Each receipt must be 10MB or less");
  }

  const rawExtension = extname(file.name).toLowerCase();
  if (!ALLOWED_REFUND_RECEIPT_EXTENSIONS.has(rawExtension)) {
    throw new Error("Only PNG, JPG, WEBP, or PDF receipts are allowed");
  }

  if (file.type && !ALLOWED_REFUND_RECEIPT_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported receipt file type");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = join(process.cwd(), "public", "uploads", "refund-receipts");
  await mkdir(uploadsDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "receipt.bin";
  const filename = `${Date.now()}-${userId}-${safeName}`;
  const filepath = join(uploadsDir, filename);

  await writeFile(filepath, buffer);

  return `/uploads/refund-receipts/${filename}`;
}

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

// Helper: Notify all Director users
async function notifyDirectors(title: string, message: string, link?: string) {
  const ceoUsers = await db.user.findMany({
    where: {
      role: { in: ["ADMIN", "CEO"] },
    },
  });

  for (const user of ceoUsers) {
    await createNotification(user.id, "REQUISITION_SUBMITTED", title, message, link);
  }
}

async function notifyDepartmentManagers(departmentId: number | null, title: string, message: string, link?: string) {
  if (!departmentId) return;

  const managers = await db.user.findMany({
    where: {
      role: "MANAGER",
      departmentId,
      isActive: true,
    },
  });

  for (const manager of managers) {
    await createNotification(manager.id, "REQUISITION_SUBMITTED", title, message, link);
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

  const initialStatus =
    user.role === "CEO" || user.role === "ADMIN"
      ? "PENDING_FINANCE"
      : user.role === "MANAGER"
        ? "PENDING_CEO"
        : user.departmentId
          ? "PENDING_MANAGER"
          : "PENDING_CEO";

  const requisition = await db.requisition.create({
    data: {
      userId: user.id,
      title: data.title,
      reason: data.reason,
      totalAmount,
      status: initialStatus,
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

  if (initialStatus === "PENDING_MANAGER") {
    await notifyDepartmentManagers(
      requisition.user.departmentId,
      "Requisition Pending Department Manager Approval",
      `${requisition.user.name} has submitted a requisition for KES ${requisition.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      "/finance/requisitions"
    );
  } else if (initialStatus === "PENDING_CEO") {
    await notifyDirectors(
      "Requisition Pending Directors Approval",
      `${requisition.user.name} has submitted a requisition for KES ${requisition.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      "/finance/requisitions"
    );
  } else {
    await notifyFinanceDepartment(
      "Requisition Pending Finance Approval",
      `${requisition.user.name} has submitted a requisition for KES ${requisition.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      "/finance/requisitions"
    );
  }

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return requisition;
}

export async function advanceRequisition(reqId: number, note?: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const requisition = await db.requisition.findUnique({
    where: { id: reqId },
    include: { user: { include: { department: true } } },
  });
  if (!requisition) throw new Error("Requisition not found");

  if (canApproveRequisitionAsManager(user, requisition.user.departmentId)) {
    if (requisition.status !== "PENDING_MANAGER") {
      throw new Error("Not pending manager approval");
    }

    const updated = await db.requisition.update({
      where: { id: reqId },
      data: {
        status: "PENDING_CEO",
        managerNote: note || null,
      },
      include: { user: true },
    });

    await notifyDirectors(
      "Requisition Pending Directors Approval",
      `${requisition.user.name} has a requisition for KES ${requisition.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending your approval`,
      "/finance/requisitions"
    );

    revalidatePath("/requisitions");
    revalidatePath("/finance/requisitions");
    return updated;
  }

  if (canApproveRequisitionAsCEO(user)) {
    if (requisition.status !== "PENDING_CEO") {
      throw new Error("Not pending directors approval");
    }

    const updated = await db.requisition.update({
      where: { id: reqId },
      data: {
        status: "PENDING_FINANCE",
        ceoNote: note || null,
      },
      include: { user: true },
    });

    await notifyFinanceDepartment(
      "Requisition Pending Finance Approval",
      `${requisition.user.name} has a requisition for KES ${requisition.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending finance approval`,
      "/finance/requisitions"
    );

    revalidatePath("/requisitions");
    revalidatePath("/finance/requisitions");
    return updated;
  }

  if (!canApproveRequisitionAsFinance(user)) {
    throw new Error("Unauthorized");
  }

  if (requisition.status !== "PENDING_FINANCE") {
    throw new Error("Not pending finance approval");
  }

  const updated = await db.requisition.update({
    where: { id: reqId },
    data: {
      status: "APPROVED",
      financeNote: note || null,
    },
    include: { user: true },
  });

  await createNotification(
    requisition.userId,
    "REQUISITION_APPROVED",
    "Requisition Approved",
    `Your requisition for KES ${requisition.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been approved by Finance`,
    "/requisitions"
  );

  revalidatePath("/requisitions");
  revalidatePath("/finance/requisitions");
  return updated;
}

export async function rejectRequisition(reqId: number, note: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const requisition = await db.requisition.findUnique({
    where: { id: reqId },
    include: { user: true },
  });
  if (!requisition) throw new Error("Requisition not found");

  if (canApproveRequisitionAsManager(user, requisition.user.departmentId)) {
    if (requisition.status !== "PENDING_MANAGER") throw new Error("Not pending manager approval");

    const updated = await db.requisition.update({
      where: { id: reqId },
      data: {
        status: "DENIED",
        managerNote: note,
      },
    });

    await createNotification(
      requisition.userId,
      "REQUISITION_DENIED",
      "Requisition Rejected",
      `Your requisition has been rejected by your Department Manager. Reason: ${note}`,
      "/requisitions"
    );

    revalidatePath("/requisitions");
    revalidatePath("/finance/requisitions");
    return updated;
  }

  if (canApproveRequisitionAsCEO(user)) {
    if (requisition.status !== "PENDING_CEO") throw new Error("Not pending directors approval");

    const updated = await db.requisition.update({
      where: { id: reqId },
      data: {
        status: "DENIED",
        ceoNote: note,
      },
    });

    await createNotification(
      requisition.userId,
      "REQUISITION_DENIED",
      "Requisition Rejected",
      `Your requisition has been rejected by Directors. Reason: ${note}`,
      "/requisitions"
    );

    revalidatePath("/requisitions");
    revalidatePath("/finance/requisitions");
    return updated;
  }

  if (!canApproveRequisitionAsFinance(user)) {
    throw new Error("Unauthorized");
  }

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

export async function submitRequisitionForApproval(reqId: number, note?: string) {
  return advanceRequisition(reqId, note);
}

export async function rejectRequisitionAsFinance(reqId: number, note: string) {
  return rejectRequisition(reqId, note);
}

export async function approveRequisitionAsCEO(reqId: number, note?: string) {
  return advanceRequisition(reqId, note);
}

export async function rejectRequisitionAsCEO(reqId: number, note: string) {
  return rejectRequisition(reqId, note);
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

export async function createRefund(data: { amount: number; reason: string; receiptUrls?: string[] }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const refund = await db.refund.create({
    data: {
      userId: user.id,
      amount: data.amount,
      reason: data.reason,
      receiptUrls: data.receiptUrls ?? [],
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

export async function createRefundWithReceipts(formData: FormData) {
  const amountRaw = String(formData.get("amount") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Please provide a valid refund amount");
  }

  if (!reason) {
    throw new Error("Please provide a refund justification");
  }

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const files = formData
    .getAll("receipts")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length > 6) {
    throw new Error("You can upload up to 6 receipt files per refund request");
  }

  const receiptUrls: string[] = [];
  for (const file of files) {
    const receiptUrl = await persistRefundReceipt(file, user.id);
    receiptUrls.push(receiptUrl);
  }

  return createRefund({
    amount,
    reason,
    receiptUrls,
  });
}

// Finance submits refund for Director approval
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

  // Notify Directors that refund is pending their approval
  await notifyDirectors(
    "Refund Pending Director Approval",
    `${refund.user.name} has a refund request for KES ${refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending your approval`,
    "/finance/refunds"
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

// Director approves refund
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
  if (refund.status !== "PENDING_CEO") throw new Error("Not pending Director approval");

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
    `Your refund request for KES ${refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been approved by Director`,
    "/refunds"
  );

  revalidatePath("/refunds");
  revalidatePath("/finance/refunds");
  return updated;
}

// Director rejects refund
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
  if (refund.status !== "PENDING_CEO") throw new Error("Not pending Director approval");

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
    `Your refund request has been rejected by Director. Reason: ${note}`,
    "/refunds"
  );

  revalidatePath("/refunds");
  revalidatePath("/finance/refunds");
  return updated;
}
