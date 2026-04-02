"use server";

import { db } from "@/lib/db";
import { getCurrentUser, canManageUsers, canManageSystemSettings } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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
  password: string;
  name: string;
  role: "ADMIN" | "CEO" | "MANAGER" | "EMPLOYEE";
  departmentId?: number;
}) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
    throw new Error("Unauthorized");
  }

  // Check if email already exists
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new Error("Email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newUser = await db.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role,
      departmentId: data.departmentId || null,
    },
  });

  revalidatePath("/admin/users");
  return newUser;
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    // Improved extension extraction
    let ext = "png";
    if (file.type === "image/jpeg") ext = "jpg";
    else if (file.type === "image/gif") ext = "gif";
    else if (file.type === "image/webp") ext = "webp";
    else if (file.type === "image/svg+xml") ext = "svg";
    
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
