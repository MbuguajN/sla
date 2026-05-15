/**
 * Password & Email Validation Utilities
 */

const ALLOWED_EMAIL_DOMAINS = ["@5dm.africa", "@myhappyhour.co.ke"];

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate email domain - only @5dm.africa or @myhappyhour.co.ke allowed
 */
export function validateEmailDomain(email: string): { isValid: boolean; error?: string } {
  const trimmedEmail = email.toLowerCase().trim();
  
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { isValid: false, error: "Invalid email format" };
  }

  const domain = trimmedEmail.substring(trimmedEmail.indexOf("@"));
  
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return {
      isValid: false,
      error: `Email must be from an approved domain: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push("Password is required");
    return { isValid: false, errors };
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter (A-Z)");
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter (a-z)");
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number (0-9)");
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*, etc.)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a human-readable temporary password
 * Format: [Word][Number][SpecialChar][Month/Year]
 * Example: Welcome@2026, Secure#2026, Strong!2026
 */
export function generateTemporaryPassword(): string {
  const words = [
    "Welcome",
    "Secure",
    "Strong",
    "Access",
    "Portal",
    "System",
    "Cloud",
    "Digital",
    "Enterprise",
    "Professional",
  ];
  
  const specialChars = ["@", "#", "$", "!", "&"];
  const currentYear = new Date().getFullYear();
  
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomNumber = Math.floor(Math.random() * 900) + 100; // 100-999
  const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Format: Word + SpecialChar + Number + Year
  return `${randomWord}${randomSpecial}${randomNumber}`;
}

/**
 * Generate a secure random reset token (base64 encoded)
 */
export function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64").replace(/[+/=]/g, (char) => {
    const replacements: Record<string, string> = { "+": "-", "/": "_", "=": "" };
    return replacements[char] || char;
  });
}

/**
 * Get password validation requirements as readable text
 */
export function getPasswordRequirementsText(): string {
  return `Password must contain:
- At least 8 characters
- 1 uppercase letter (A-Z)
- 1 lowercase letter (a-z)
- 1 number (0-9)
- 1 special character (!@#$%^&*, etc.)`;
}

/**
 * Check if password meets minimum requirements
 */
export function meetsMinimumRequirements(password: string): boolean {
  return validatePasswordStrength(password).isValid;
}
