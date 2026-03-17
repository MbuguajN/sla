import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db } from "./db";

// Department slugs
export const DEPARTMENTS = {
  CREATIVE: "creative",
  CONTENT: "content",
  TECHNOLOGY: "technology",
  MEDIA: "media",
  BUSINESS_DEV: "business-development",
  FINANCE: "finance",
  CLIENT_SERVICE: "client-service",
  GENERAL: "general-staff",
  HR: "human-resources",
} as const;

export type UserWithDepartment = {
  id: number;
  email: string;
  name: string;
  role: string;
  departmentId: number | null;
  departmentSlug: string | null;
  isActive: boolean;
};

// Get current user from session
export async function getCurrentUser(): Promise<UserWithDepartment | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: parseInt(session.user.id) },
    include: { department: true },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
    departmentSlug: user.department?.slug || null,
    isActive: user.isActive,
  };
}

// ============== CLIENT PERMISSIONS ==============
// Only Business Development can onboard (create) clients
export function canOnboardClient(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.BUSINESS_DEV;
}

export function canViewClients(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return (
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV ||
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE
  );
}

// ============== PROJECT PERMISSIONS ==============
// Only Client Service and Business Development can create projects
export function canCreateProject(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return (
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE ||
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV
  );
}

// Only departments involved in project can access it
export async function canAccessProject(
  user: { role: string; departmentId: number | null; departmentSlug: string | null },
  projectId: number
): Promise<boolean> {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  if (
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV ||
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE
  ) {
    return true;
  }

  // Check if user's department is involved in the project
  if (!user.departmentId) return false;

  const projectDept = await db.projectDepartment.findFirst({
    where: {
      projectId,
      departmentId: user.departmentId,
    },
  });

  return !!projectDept;
}

export function canViewAllProjects(user: { role: string }): boolean {
  return user.role === "ADMIN" || user.role === "CEO";
}

// ============== TASK PERMISSIONS ==============
// Only Client Service and Business Development can create/initiate tasks
export function canCreateTask(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return (
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE ||
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV
  );
}

// Only department managers can assign tasks to their team
export function canAssignTaskToEmployee(
  user: { role: string; departmentSlug: string | null },
  taskDepartmentSlug: string | null
): boolean {
  if (user.role !== "MANAGER") return false;
  return user.departmentSlug === taskDepartmentSlug;
}

// Only assignee can confirm task receipt
export function canConfirmTask(userId: number, taskAssigneeId: number | null): boolean {
  if (!taskAssigneeId) return false;
  return userId === taskAssigneeId;
}

// Only assignee can pause/resume task
export function canPauseTask(userId: number, taskAssigneeId: number | null): boolean {
  if (!taskAssigneeId) return false;
  return userId === taskAssigneeId;
}

// Only assignee can submit task for review
export function canSubmitTask(userId: number, taskAssigneeId: number | null): boolean {
  if (!taskAssigneeId) return false;
  return userId === taskAssigneeId;
}

// Only task initiator (creator) can mark task as done
export function canMarkTaskDone(
  user: { id: number; role: string },
  taskCreatorId: number
): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.id === taskCreatorId;
}

// Only task initiator can request revision
export function canRequestRevision(
  user: { id: number; role: string },
  taskCreatorId: number
): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.id === taskCreatorId;
}

// ============== HR PERMISSIONS ==============
export function canViewHRData(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.HR;
}

export function canManageLeaves(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.HR;
}

export function canViewSuggestions(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.HR;
}

// ============== FINANCE PERMISSIONS ==============
export function canViewFinanceData(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.FINANCE;
}

export function canManageRefunds(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.FINANCE;
}

// Requisition approval chain
export function canApproveRequisitionAsManager(
  user: { role: string; departmentId: number | null },
  requisitionUserDeptId: number | null
): boolean {
  if (user.role !== "MANAGER") return false;
  return user.departmentId === requisitionUserDeptId;
}

export function canApproveRequisitionAsFinance(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN") return true;
  return user.departmentSlug === DEPARTMENTS.FINANCE;
}

export function canApproveRequisitionAsCEO(user: { role: string }): boolean {
  return user.role === "ADMIN" || user.role === "CEO";
}

// ============== IT SUPPORT PERMISSIONS ==============
export function canManageITTickets(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.TECHNOLOGY;
}

export function canAssignITTicket(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  // Only IT department manager can assign
  if (user.role !== "MANAGER") return false;
  return user.departmentSlug === DEPARTMENTS.TECHNOLOGY;
}

// ============== ADMIN PERMISSIONS ==============
export function canManageUsers(user: { role: string }): boolean {
  return user.role === "ADMIN";
}

export function canManageSystemSettings(user: { role: string }): boolean {
  return user.role === "ADMIN";
}

export function isAdmin(user: { role: string }): boolean {
  return user.role === "ADMIN";
}

export function isCEO(user: { role: string }): boolean {
  return user.role === "CEO";
}

export function isManager(user: { role: string }): boolean {
  return user.role === "MANAGER";
}

export function isEmployee(user: { role: string }): boolean {
  return user.role === "EMPLOYEE";
}

// CEO can see everything (birds eye view)
export function hasBirdsEyeView(user: { role: string }): boolean {
  return user.role === "ADMIN" || user.role === "CEO";
}
