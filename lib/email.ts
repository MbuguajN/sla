import nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

/**
 * Initialize Brevo SMTP transporter
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST;
  const port = parseInt(process.env.MAIL_PORT || "587");
  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;
  const encryption = (process.env.MAIL_ENCRYPTION || "tls").toLowerCase();
  const secure = encryption === "ssl" || encryption === "true" || port === 465;

  if (!host || !user || !pass) {
    throw new Error("Email configuration missing. Check MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM_ADDRESS.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

/**
 * Send user invite email with temporary password
 */
export async function sendInviteEmail(
  email: string,
  inviteToken: string,
  userName: string,
  appDomain: string
): Promise<void> {
  try {
    const transport = getTransporter();
    const fromAddress = process.env.MAIL_FROM_ADDRESS || "portal@5dm.africa";
    const fromName = process.env.MAIL_FROM_NAME || "5DM Portal";
    const inviteUrl = `https://${appDomain}/change-password?invite=${encodeURIComponent(inviteToken)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { margin: 0; padding: 24px 0; background: #eceef2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #202938; }
            .container { max-width: 500px; margin: 0 auto; padding: 0 14px; }
            .card { background: #f9fafb; border: 1px solid #dfe3e8; border-radius: 12px; box-shadow: 0 8px 24px rgba(18, 24, 40, 0.08); overflow: hidden; }
            .header { background: #c91f41; color: #ffffff; padding: 22px 24px 20px; text-align: center; }
            .title { margin: 0; font-size: 30px; font-weight: 800; line-height: 1.12; letter-spacing: -0.02em; }
            .subtitle { margin: 7px 0 0; font-size: 12px; font-weight: 700; color: #f7d6de; }
            .content { padding: 22px 24px 16px; }
            .greeting { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #2c3446; }
            .muted { margin: 0; color: #6d7585; font-size: 14px; line-height: 1.5; font-weight: 600; }
            .panel { background: #eef1f5; border: 1px solid #d8dde5; border-radius: 8px; padding: 12px 14px; margin: 16px 0; }
            .panel p { margin: 0; font-size: 13px; color: #4f596a; font-weight: 700; }
            .panel p + p { margin-top: 8px; }
            .button-wrap { margin: 16px 0 14px; }
            .button,
            .button:visited,
            .button:hover,
            .button:active { display: inline-block; background: #c91f41; color: #ffffff !important; -webkit-text-fill-color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 10px 18px; border-radius: 6px; box-shadow: 0 6px 14px rgba(201, 31, 65, 0.24); }
            .warning { background: #fff0f2; border: 1px solid #f7c9d2; color: #b22345; border-radius: 8px; padding: 11px 12px; margin: 12px 0 10px; font-size: 12px; line-height: 1.45; font-weight: 700; }
            .support { margin: 10px 0 0; color: #848c99; font-size: 11px; line-height: 1.45; font-weight: 600; }
            .support a { color: #7a8392; text-decoration: underline; }
            .footer { text-align: center; color: #a0a7b3; font-size: 10px; font-weight: 700; padding: 8px 0 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1 class="title">Welcome to 5DM Portal</h1>
                <p class="subtitle">Your account is ready for first-time setup</p>
              </div>
              <div class="content">
                <p class="greeting">Hi ${userName},</p>
                <p class="muted">Your account has been created on the 5DM Portal. Use the button below to set your password and activate your account.</p>

                <div class="panel">
                  <p><strong>Account Email:</strong> ${email}</p>
                  <p><strong>Next step:</strong> Set your new password using the secure button below.</p>
                </div>

                <div class="button-wrap">
                <a href="${inviteUrl}" class="button">Set Password and Continue</a>
                </div>

                <div class="warning">
                  <strong>Security Notice:</strong> This invitation link is for your account only. Do not share it with anyone.
                </div>

                <p class="support">If you have any questions, please contact your administrator. If the button does not open correctly, you can visit <a href="https://${appDomain}">${appDomain}</a>.</p>
              </div>

              <div class="footer">
                <p>&copy; 2026 5DM. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Welcome to 5DM Portal

Your account has been created.

Email: ${email}

Set your password here:
${inviteUrl}

SECURITY NOTICE: This invitation link is for your account only. Do not share this email or link with anyone.

If you have any questions, please contact your administrator.
    `;

    await transport.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: email,
      subject: `Welcome to 5DM Portal - Set Your Password`,
      html: htmlContent,
      text: textContent,
    });

    console.log(`✓ Invite email sent to ${email}`);
  } catch (error) {
    console.error(`✗ Failed to send invite email to ${email}:`, error);
    throw new Error(`Failed to send invite email: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Send password reset email with reset code
 */
export async function sendPasswordResetEmail(
  email: string,
  resetCode: string,
  appDomain: string
): Promise<void> {
  try {
    const transport = getTransporter();
    const fromAddress = process.env.MAIL_FROM_ADDRESS || "portal@5dm.africa";
    const fromName = process.env.MAIL_FROM_NAME || "5DM Portal";
    const resetUrl = `https://${appDomain}/password-reset?code=${resetCode}&email=${encodeURIComponent(email)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #25314a; background: #edeef3; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #c91f41; color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; }
            .content { background: #fbfbfc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e9ebf0; border-top: 0; }
            .section { margin-bottom: 20px; }
            .code-box { background: white; padding: 20px; border: 1px solid #e9ebf0; border-radius: 14px; margin: 20px 0; text-align: center; }
            .code-label { font-size: 12px; color: #75666f; margin-bottom: 10px; }
            .code-value { font-size: 18px; font-weight: bold; color: #25314a; letter-spacing: 2px; font-family: 'Courier New', monospace; }
            .button { display: inline-block; background: #c91f41; color: white; padding: 12px 30px; text-decoration: none; border-radius: 12px; margin: 20px 0; font-weight: 800; }
            .footer { text-align: center; color: #75666f; font-size: 12px; margin-top: 30px; }
            .warning { background: #fff1f4; border: 1px solid #f8b4c0; color: #8b1531; padding: 12px; border-radius: 12px; margin: 15px 0; font-size: 13px; }
            .expiry { background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; padding: 12px; border-radius: 12px; margin: 15px 0; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
              <p>5DM Portal</p>
            </div>
            <div class="content">
              <div class="section">
                <p>We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
              </div>

              <div class="section">
                <p><strong>Your password reset code:</strong></p>
                <div class="code-box">
                  <div class="code-label">Reset Code (valid for 15 minutes)</div>
                  <div class="code-value">${resetCode}</div>
                </div>
              </div>

              <div class="expiry">
                <strong>⏱️ Important:</strong> This reset code will expire in 15 minutes. You must complete the password reset within this time.
              </div>

              <div class="section">
                <p><strong>To reset your password:</strong></p>
                <ol>
                  <li>Copy the reset code displayed above</li>
                  <li>Go to the password reset page and paste the code</li>
                  <li>Enter your new password</li>
                  <li>Log in with your new password</li>
                </ol>
              </div>

              <div class="warning">
                <strong>🔒 Security Warning:</strong> Do not share this code with anyone. Never give your password or reset code to another person.
              </div>

              <div class="footer">
                <p>&copy; 2026 5DM. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Reset Your Password

We received a request to reset your password. If you didn't make this request, you can ignore this email.

Your password reset code (valid for 15 minutes):
${resetCode}

Or visit this link:
${resetUrl}

To reset your password:
1. Copy the reset code displayed above
2. Go to the password reset page and paste the code
3. Enter your new password
4. Log in with your new password

SECURITY WARNING: Do not share this code with anyone. Never give your password or reset code to another person.
    `;

    await transport.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: email,
      subject: `Password Reset Request - 5DM Portal`,
      html: htmlContent,
      text: textContent,
    });

    console.log(`✓ Password reset email sent to ${email}`);
  } catch (error) {
    console.error(`✗ Failed to send password reset email to ${email}:`, error);
    throw new Error(`Failed to send reset email: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log("✓ Email configuration verified successfully");
    return true;
  } catch (error) {
    console.error("✗ Email configuration failed:", error);
    return false;
  }
}
