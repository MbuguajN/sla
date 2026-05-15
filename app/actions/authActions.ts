"use server";

import bcrypt from "bcryptjs";
import { db as prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  validateEmailDomain,
  validatePasswordStrength,
  generateResetToken,
} from "@/lib/validators";
import crypto from "crypto";

const RESET_TOKEN_EXPIRY_MINUTES = 15;
const RESET_REQUEST_RATE_LIMIT = 3;
const RATE_LIMIT_WINDOW_MINUTES = 15;

/**
 * Hash a reset token for storage in database
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function validateInviteToken(
  token: string
): Promise<{
  isValid: boolean;
  email?: string;
  userId?: number;
  error?: string;
}> {
  try {
    const hashedToken = hashToken(token);
    const inviteToken = await prisma.userInviteToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!inviteToken || inviteToken.usedAt) {
      return { isValid: false, error: "Invalid or expired invitation link" };
    }

    if (inviteToken.expiresAt < new Date()) {
      await prisma.userInviteToken.delete({ where: { id: inviteToken.id } });
      return { isValid: false, error: "Invitation link has expired" };
    }

    if (!inviteToken.user.passwordSetupRequired) {
      return { isValid: false, error: "Invitation has already been used" };
    }

    return {
      isValid: true,
      email: inviteToken.email,
      userId: inviteToken.userId,
    };
  } catch (error) {
    console.error("Invite token validation error:", error);
    return { isValid: false, error: "An error occurred. Please try again." };
  }
}

/**
 * Request a password reset email
 * Rate-limited to prevent abuse
 */
export async function requestPasswordReset(
  email: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Validate email domain
    const domainValidation = validateEmailDomain(email);
    if (!domainValidation.isValid) {
      // Generic message to prevent user enumeration
      return {
        success: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limiting - max 3 requests per email per 15 minutes
    const recentRequests = await prisma.passwordResetToken.count({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000),
        },
      },
    });

    if (recentRequests >= RESET_REQUEST_RATE_LIMIT) {
      // Generic message to prevent user enumeration
      return {
        success: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      };
    }

    // Check if user exists with this email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Generic message to prevent user enumeration
      return {
        success: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      };
    }

    // Generate reset token
    const plainToken = generateResetToken();
    const hashedToken = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // Clean up any expired tokens
    await prisma.passwordResetToken.deleteMany({
      where: {
        email: normalizedEmail,
        expiresAt: { lt: new Date() },
      },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token: hashedToken,
        expiresAt,
      },
    });

    // Send password reset email
    const appDomain = process.env.APP_DOMAIN || "ops.5dm.africa";
    await sendPasswordResetEmail(normalizedEmail, plainToken, appDomain);

    return {
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    };
  } catch (error) {
    console.error("Password reset request error:", error);
    return {
      success: false,
      message: "An error occurred. Please try again later.",
    };
  }
}

/**
 * Validate password reset token
 */
export async function validatePasswordResetToken(
  email: string,
  token: string
): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email domain
    const domainValidation = validateEmailDomain(normalizedEmail);
    if (!domainValidation.isValid) {
      return { isValid: false, error: domainValidation.error };
    }

    // Hash the provided token
    const hashedToken = hashToken(token);

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!resetToken) {
      return { isValid: false, error: "Invalid or expired reset code" };
    }

    // Check if email matches
    if (resetToken.email !== normalizedEmail) {
      return { isValid: false, error: "Invalid or expired reset code" };
    }

    // Check if token has expired
    if (resetToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return { isValid: false, error: "Reset code has expired" };
    }

    return { isValid: true };
  } catch (error) {
    console.error("Token validation error:", error);
    return { isValid: false, error: "An error occurred. Please try again." };
  }
}

/**
 * Reset password with valid token
 */
export async function resetPassword(
  email: string,
  token: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email domain
    const domainValidation = validateEmailDomain(normalizedEmail);
    if (!domainValidation.isValid) {
      return {
        success: false,
        message: domainValidation.error || "Invalid email domain",
      };
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: `Password requirements not met:\n${passwordValidation.errors.join("\n")}`,
      };
    }

    // Validate reset token
    const tokenValidation = await validatePasswordResetToken(normalizedEmail, token);
    if (!tokenValidation.isValid) {
      return {
        success: false,
        message: tokenValidation.error || "Invalid or expired reset code",
      };
    }

    // Hash the provided token for lookup
    const hashedToken = hashToken(token);

    // Get the reset token record
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!resetToken) {
      return {
        success: false,
        message: "Invalid or expired reset code",
      };
    }

    // Find and update user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear first-login requirement for reset users
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordSetupRequired: false,
      },
    });

    // Delete the reset token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    // Clean up all other reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    return {
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      message: "An error occurred while resetting your password. Please try again.",
    };
  }
}

/**
 * Check if user needs to change password on first login
 */
export async function checkFirstLoginRequired(userId: number): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordSetupRequired: true },
    });

    return !!user?.passwordSetupRequired;
  } catch (error) {
    console.error("Error checking first login requirement:", error);
    return false;
  }
}

/**
 * Change password on first login
 */
export async function changeFirstLoginPassword(
  userId: number,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Check if user needs to change password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstLoginAt: true, email: true, passwordSetupRequired: true },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: `Password requirements not met:\n${passwordValidation.errors.join("\n")}`,
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and set firstLoginAt
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        firstLoginAt: user.firstLoginAt || new Date(),
        passwordSetupRequired: false,
      },
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error) {
    console.error("Error changing first login password:", error);
    return {
      success: false,
      message: "An error occurred while changing your password. Please try again.",
    };
  }
}

export async function completeInvitePasswordSetup(
  inviteToken: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
  email?: string;
}> {
  try {
    const inviteValidation = await validateInviteToken(inviteToken);
    if (!inviteValidation.isValid || !inviteValidation.userId || !inviteValidation.email) {
      return {
        success: false,
        message: inviteValidation.error || "Invalid or expired invitation link",
      };
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: `Password requirements not met:\n${passwordValidation.errors.join("\n")}`,
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: inviteValidation.userId },
        data: {
          password: hashedPassword,
          passwordSetupRequired: false,
          firstLoginAt: new Date(),
        },
      }),
      prisma.userInviteToken.update({
        where: { userId: inviteValidation.userId },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: "Password set successfully",
      email: inviteValidation.email,
    };
  } catch (error) {
    console.error("Error completing invite password setup:", error);
    return {
      success: false,
      message: "An error occurred while setting your password. Please try again.",
    };
  }
}
