"use server";

import { db } from "@/lib/db";
import { getCurrentUser, canManageUsers, canManageSystemSettings } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { sendInviteEmail } from "@/lib/email";
import { validateEmailDomain } from "@/lib/validators";
import { Privilege, Prisma } from "@prisma/client";

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

function startsWithBytes(buffer: Buffer, bytes: number[]) {
  if (buffer.length < bytes.length) return false;
  return bytes.every((value, index) => buffer[index] === value);
}

function detectImageMime(buffer: Buffer): "image/png" | "image/jpeg" | "image/gif" | "image/webp" | "unknown" {
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (
    startsWithBytes(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return "unknown";
}

// ============== USER MANAGEMENT ==============

export async function getUsers() {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  return db.user.findMany({
    include: { department: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(data: {
  email: string;
  password?: string;
  name: string;
  role: "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE";
  departmentId?: number;
}) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return { success: false, message: "Email already exists" };
    }

    // Validate domain
    const domainValidation = validateEmailDomain(data.email);
    if (!domainValidation.isValid) {
      return { success: false, message: domainValidation.error || "Invalid email domain" };
    }

    // Generate a placeholder password; the invite link is the real onboarding path.
    const finalPassword = data.password || crypto.randomBytes(24).toString("hex");
    const hashedPassword = await bcrypt.hash(finalPassword, 10);
    const plainInviteToken = crypto.randomBytes(32).toString("hex");
    const hashedInviteToken = crypto.createHash("sha256").update(plainInviteToken).digest("hex");

    const newUser = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.role,
          departmentId: data.departmentId || null,
          passwordSetupRequired: true,
          firstLoginAt: null,
        },
      });

      await tx.userInviteToken.upsert({
        where: { userId: createdUser.id },
        update: {
          email: data.email,
          token: hashedInviteToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          usedAt: null,
        },
        create: {
          userId: createdUser.id,
          email: data.email,
          token: hashedInviteToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return createdUser;
    });

    // Send invitation email
    try {
      const appDomain = process.env.APP_DOMAIN || "ops.5dm.africa";
      await sendInviteEmail(data.email, plainInviteToken, data.name, appDomain);
    } catch (error) {
      console.error("Failed to send invitation email:", error);
    }

    revalidatePath("/admin/users");
    return { success: true, message: "User created", userId: newUser.id };
  } catch (error) {
    console.error("CREATE_USER_ERROR:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { success: false, message: "Email already exists" };
      }

      if (error.code === "P2021" || error.code === "P2022") {
        return {
          success: false,
          message:
            "Production database schema is not up to date for user onboarding. Please run the latest Prisma migrations on the live server.",
        };
      }
    }

    return {
      success: false,
      message: "Unable to create user right now. Please try again or contact support.",
    };
  }
}

export async function updateUser(
  userId: number,
  data: {
    email?: string;
    name?: string;
    role?: "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE";
    departmentId?: number | null;
    isActive?: boolean;
    password?: string;
  }
) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  // If email is being updated, check it's not taken
  if (data.email) {
    const existing = await db.user.findFirst({
      where: { email: data.email, NOT: { id: userId } },
    });
    if (existing) {
      throw new Error("Email already exists");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.email) updateData.email = data.email;
  if (data.name) updateData.name = data.name;
  if (data.role) updateData.role = data.role;
  if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: updateData,
  });

  revalidatePath("/admin/users");
  return updatedUser;
}

export async function deleteUser(userId: number) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  // Prevent deleting yourself
  if (user.id === userId) {
    throw new Error("Cannot delete yourself");
  }

  await db.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
}

export async function getUserPrivileges(userId: number) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  const privileges = await db.userPrivilege.findMany({
    where: { userId },
    select: { privilege: true },
  });

  return privileges.map((entry) => entry.privilege);
}

export async function grantUserPrivilege(userId: number, privilege: Privilege) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  if (userId === user.id) {
    throw new Error("You cannot modify your own privilege grants");
  }

  await db.userPrivilege.upsert({
    where: {
      userId_privilege: {
        userId,
        privilege,
      },
    },
    update: {
      grantedById: user.id,
      grantedAt: new Date(),
    },
    create: {
      userId,
      privilege,
      grantedById: user.id,
    },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function revokeUserPrivilege(userId: number, privilege: Privilege) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  if (userId === user.id) {
    throw new Error("You cannot modify your own privilege grants");
  }

  await db.userPrivilege.deleteMany({
    where: {
      userId,
      privilege,
    },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

// ============== DEPARTMENT MANAGEMENT ==============

export async function getDepartments() {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  return db.department.findMany({
    include: {
      head: true,
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function updateDepartment(
  departmentId: number,
  data: { name?: string; headId?: number | null }
) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.headId !== undefined) updateData.headId = data.headId;

  const updatedDept = await db.department.update({
    where: { id: departmentId },
    data: updateData,
  });

  revalidatePath("/admin/departments");
  return updatedDept;
}

// ============== SYSTEM SETTINGS ==============

export async function getSystemSettings() {
  const user = await getCurrentUser();
  if (!user || !canManageSystemSettings(user)) {
    throw new Error("Unauthorized");
  }

  return db.systemSetting.findMany({
    orderBy: { key: "asc" },
  });
}

export async function updateSystemSetting(key: string, value: string) {
  const user = await getCurrentUser();
  if (!user || !canManageSystemSettings(user)) {
    throw new Error("Unauthorized");
  }

  const setting = await db.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  revalidatePath("/admin/settings");
  if (key === "task_sla_min_hours") {
    revalidatePath("/tasks/new");
  }
  return setting;
}

export async function uploadLogo(formData: FormData, mode: "light" | "dark" = "light") {
  const user = await getCurrentUser();
  if (!user || !canManageSystemSettings(user)) {
    throw new Error("Unauthorized");
  }

  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    if (file.size <= 0) {
      throw new Error("File is empty");
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      throw new Error("Logo too large. Max size is 5MB");
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detectedMime = detectImageMime(buffer);
    if (detectedMime === "unknown") {
      throw new Error("Unsupported or unsafe image format");
    }

    if (file.type !== detectedMime) {
      throw new Error("Image type does not match file contents");
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    // Extension is derived from validated mime signature.
    let ext = "png";
    if (detectedMime === "image/jpeg") ext = "jpg";
    else if (detectedMime === "image/gif") ext = "gif";
    else if (detectedMime === "image/webp") ext = "webp";
    
    const filename = `logo-${mode}-${timestamp}.${ext}`;
    const filepath = join(uploadsDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Save logo path to system settings
    // Use the API route to serve dynamic content in production
    const logoKey = mode === "light" ? "company_logo_light" : "company_logo_dark";
    const logoPath = `/api/uploads/${filename}`;
    
    await db.systemSetting.upsert({
      where: { key: logoKey },
      update: { value: logoPath },
      create: { key: logoKey, value: logoPath },
    });

    // Mirror to company_logo if it's light mode for general usage
    if (mode === "light") {
      await db.systemSetting.upsert({
        where: { key: "company_logo" },
        update: { value: logoPath },
        create: { key: "company_logo", value: logoPath },
      });
    }

    revalidatePath("/", "layout"); // Ensure all pages catch the update
    revalidatePath("/admin/settings");

    return { success: true, logoPath };
  } catch (error) {
    console.error("LOGO_UPLOAD_ERROR:", error);
    throw new Error(`Logo upload failed: ${error instanceof Error ? error.message : "Internal Server Error"}`);
  }
}

export async function getCompanyLogos() {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: { in: ["company_logo_light", "company_logo_dark"] }
      }
    });
    
    return {
      light: settings.find(s => s.key === "company_logo_light")?.value || null,
      dark: settings.find(s => s.key === "company_logo_dark")?.value || null,
    };
  } catch {
    return { light: null, dark: null };
  }
}

// ============== DASHBOARD STATS ==============

export async function getAdminStats() {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  const [totalUsers, activeUsers, totalDepartments, totalProjects] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.department.count(),
    db.project.count(),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalDepartments,
    totalProjects,
  };
}
