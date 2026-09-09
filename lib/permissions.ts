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
  isGeneralManager: boolean;
  departmentId: number | null;
  departmentSlug: string | null;
  isActive: boolean;
};

type PermissionContext = {
  role: string;
  departmentSlug: string | null;
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
    isGeneralManager: user.isGeneralManager,
    departmentId: user.departmentId,
    departmentSlug: user.department?.slug || null,
    isActive: user.isActive,
  };
}

// ============== CLIENT PERMISSIONS ==============
// Only Business Development can onboard (create) clients
export function canOnboardClient(user: PermissionContext): boolean {
  if (user.role === "ADMIN") return true;
  return user.departmentSlug === DEPARTMENTS.BUSINESS_DEV;
}

export function canCreateClient(user: PermissionContext): boolean {
  return canOnboardClient(user);
}

// Only Business Development can close clients
export function canCloseClient(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN") return true;
  return user.departmentSlug === DEPARTMENTS.BUSINESS_DEV;
}

export function canViewClients(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO" || user.role === "MANAGER" || user.departmentSlug === DEPARTMENTS.FINANCE) return true;
  return (
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV ||
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE
  );
}

export function canViewReports(user: { role: string }): boolean {
  return user.role === "ADMIN" || user.role === "CEO";
}

// ============== PROJECT PERMISSIONS ==============
// Only Client Service and Business Development can create projects
export function canCreateProject(user: PermissionContext): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "CEO") return true;
  if (user.role === "MANAGER") return true;
  return (
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE ||
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV
  );
}

// Only departments involved in project can access it
export async function canAccessProject(
  user: { id: number; role: string; departmentId: number | null; departmentSlug: string | null },
  projectId: number
): Promise<boolean> {
  if (
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    user.role === "MANAGER" ||
    user.departmentSlug === DEPARTMENTS.FINANCE
  ) return true;
  if (
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV ||
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE
  ) {
    return true;
  }

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { createdBy: user.id },
        ...(user.departmentId ? [{ departments: { some: { departmentId: user.departmentId } } }] : []),
      ],
    },
    select: { id: true },
  });

  return Boolean(project);
}

export function canViewAllProjects(user: { role: string; departmentSlug?: string | null }): boolean {
  if (
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    user.role === "MANAGER" ||
    user.departmentSlug === DEPARTMENTS.FINANCE
  ) return true;
  return (
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE ||
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV
  );
}

// Only Business Development and Client Service can close/pause projects
export function canManageProjectStatus(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN") return true;
  return (
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV ||
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE
  );
}

// ============== TASK PERMISSIONS ==============
// Only Client Service and Business Development can create/initiate tasks
export function canCreateTask(user: PermissionContext): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "CEO") return true;
  if (user.role === "MANAGER") return true;
  return (
    user.departmentSlug === DEPARTMENTS.CLIENT_SERVICE ||
    user.departmentSlug === DEPARTMENTS.BUSINESS_DEV ||
    user.departmentSlug === DEPARTMENTS.FINANCE
  );
}

// Only department managers can assign tasks to their team
export function canAssignTaskToEmployee(
  user: { role: string; departmentSlug: string | null },
  taskDepartmentSlug: string | null
): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  if (user.role !== "MANAGER") return false;
  return user.departmentSlug === taskDepartmentSlug;
}

export function canAssignTasks(user: { role: string; departmentSlug: string | null }): boolean {
  return user.role === "ADMIN" || user.role === "CEO" || user.role === "MANAGER";
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
  taskCreatorId: number | null
): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.id === taskCreatorId;
}

// Only task initiator can request revision
export function canRequestRevision(
  user: { id: number; role: string },
  taskCreatorId: number | null
): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.id === taskCreatorId;
}

// ============== GENERAL MANAGER ==============
// A General Manager keeps their underlying Role (usually MANAGER) and gains
// company-wide visibility on top of it. It is a flag, not a role, so none of the
// existing `role === "MANAGER"` checks change behaviour.
export function isGeneralManager(user: { isGeneralManager?: boolean }): boolean {
  return Boolean(user.isGeneralManager);
}

// ============== DAILY LOG SCOPES ==============
export type LogScope = "personal" | "team" | "company";

// Managers see their department; GM/ADMIN/CEO also qualify.
export function canViewTeamLogs(user: { role: string; isGeneralManager?: boolean }): boolean {
  return (
    user.role === "ADMIN" ||
    user.role === "CEO" ||
    user.role === "MANAGER" ||
    isGeneralManager(user)
  );
}

// Only a General Manager (or ADMIN/CEO) sees the whole company.
export function canViewCompanyLogs(user: { role: string; isGeneralManager?: boolean }): boolean {
  return user.role === "ADMIN" || user.role === "CEO" || isGeneralManager(user);
}

export function allowedLogScopes(user: {
  role: string;
  isGeneralManager?: boolean;
  departmentId?: number | null;
}): LogScope[] {
  const scopes: LogScope[] = ["personal"];
  if (canViewTeamLogs(user) && user.departmentId) scopes.push("team");
  if (canViewCompanyLogs(user)) scopes.push("company");
  return scopes;
}

/**
 * Resolves which users' logs the viewer may read for a requested scope.
 * Always falls back to the viewer alone rather than throwing, so a hand-edited
 * `?scope=company` URL silently degrades to personal instead of leaking.
 */
export async function resolveLogAudience(
  user: { id: number; name?: string; role: string; isGeneralManager?: boolean; departmentId: number | null },
  scope: LogScope
): Promise<{ scope: LogScope; members: { id: number; name: string }[] }> {
  const permitted = allowedLogScopes(user);
  const effective: LogScope = permitted.includes(scope) ? scope : "personal";

  if (effective === "personal") {
    return { scope: "personal", members: [{ id: user.id, name: user.name ?? "Me" }] };
  }

  const members = await db.user.findMany({
    where: {
      isActive: true,
      ...(effective === "team" ? { departmentId: user.departmentId } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { scope: effective, members };
}

// ============== HR PERMISSIONS ==============
export function canViewHRData(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.HR;
}

// Can reach the leave review screens at all (manager stage or HR stage).
export function canManageLeaves(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO" || user.role === "MANAGER") return true;
  return user.departmentSlug === DEPARTMENTS.HR;
}

// Stage 1: a department manager approving/denying their own department's request.
// Mirrors canApproveRequisitionAsManager — a manager may not review their own leave.
export function canApproveLeaveAsManager(
  user: { id: number; role: string; departmentId: number | null },
  leave: { userId: number; userDepartmentId: number | null }
): boolean {
  if (user.role !== "MANAGER") return false;
  if (leave.userId === user.id) return false;
  if (!user.departmentId) return false;
  return user.departmentId === leave.userDepartmentId;
}

// Stage 2: the final decision. Restricted to HR / CEO / ADMIN — a MANAGER must
// never be able to finalise a request, and nobody may finalise their own.
export function canFinalizeLeaveAsHR(
  user: { id: number; role: string; departmentSlug: string | null },
  leave: { userId: number }
): boolean {
  if (leave.userId === user.id) return false;
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.HR;
}

// ============== EMPLOYEE DIRECTORY ==============
// Who may hand out directory access (was: who could grant CAN_VIEW_EMPLOYEES).
export function canManageEmployeeDirectoryAccess(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.departmentSlug === DEPARTMENTS.HR;
}

// Who may read the directory: HR/leadership by default, plus explicit grants.
export async function canViewEmployeeDirectory(user: {
  id: number;
  role: string;
  departmentSlug: string | null;
}): Promise<boolean> {
  if (canManageEmployeeDirectoryAccess(user)) return true;

  const grant = await db.employeeDirectoryViewer.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return Boolean(grant);
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

// ============== EQUIPMENT PERMISSIONS ==============
export async function canViewEquipment(user: { id: number; role: string }): Promise<boolean> {
  if (user.role === "ADMIN") return true;

  const viewer = await db.equipmentViewer.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return !!viewer;
}

export function canManageEquipment(user: { role: string }): boolean {
  return user.role === "ADMIN";
}

export function canAssignITTicket(user: { role: string; departmentSlug: string | null }): boolean {
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  // Only IT department manager can assign
  if (user.role !== "MANAGER") return false;
  return user.departmentSlug === DEPARTMENTS.TECHNOLOGY;
}

export function canAssignTasksToDepartment(departmentSlug: string | null): boolean {
  if (!departmentSlug) return false;
  // Keep HR excluded from this workflow; all other departments (including BD and Client Service) are assignable.
  return departmentSlug !== DEPARTMENTS.HR;
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
