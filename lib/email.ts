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
  const secure = process.env.MAIL_ENCRYPTION === "ssl"; // true for 465, false for 587

  if (!host || !user || !pass) {
    throw new Error("Email configuration missing. Check MAIL_* environment variables.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
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
  tempPassword: string,
  userName: string,
  appDomain: string
): Promise<void> {
  try {
    const transport = getTransporter();
    const fromAddress = process.env.MAIL_FROM_ADDRESS || "portal@5dm.africa";
    const fromName = process.env.MAIL_FROM_NAME || "5DM Portal";
    const loginUrl = `https://${appDomain}/login`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .section { margin-bottom: 20px; }
            .credentials { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; font-family: 'Courier New', monospace; }
            .credentials-label { font-size: 12px; color: #999; font-family: sans-serif; margin-bottom: 5px; }
            .credentials-value { font-size: 14px; font-weight: bold; color: #333; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to 5DM Portal</h1>
              <p>Your account has been created</p>
            </div>
            <div class="content">
              <div class="section">
                <p>Hi ${userName},</p>
                <p>Your account has been created on the 5DM Portal. Below are your temporary login credentials.</p>
              </div>

              <div class="section">
                <p><strong>Login Information:</strong></p>
                <div class="credentials">
                  <div class="credentials-label">Email</div>
                  <div class="credentials-value">${email}</div>
                  <div class="credentials-label" style="margin-top: 10px;">Temporary Password</div>
                  <div class="credentials-value">${tempPassword}</div>
                </div>
              </div>

              <div class="section">
                <p><strong>Next Steps:</strong></p>
                <ol>
                  <li>Visit <a href="${loginUrl}">${appDomain}</a> and log in with the credentials above</li>
                  <li>You will be required to set a new password on your first login</li>
                  <li>Once set, you can access all portal features</li>
                </ol>
              </div>

              <div class="section">
                <a href="${loginUrl}" class="button">Go to Portal</a>
              </div>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This temporary password will expire after your first login. Do not share this email or password with anyone. If you did not create this account, please contact your administrator immediately.
              </div>

              <div class="section">
                <p>If you have any questions, please contact your administrator.</p>
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

Your account has been created. Here are your login details:

Email: ${email}
Temporary Password: ${tempPassword}

Next Steps:
1. Visit ${loginUrl} and log in with the credentials above
2. You will be required to set a new password on your first login
3. Once set, you can access all portal features

SECURITY NOTICE: This temporary password will expire after your first login. Do not share this email or password with anyone.

If you have any questions, please contact your administrator.
    `;

    await transport.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: email,
      subject: `Welcome to 5DM Portal - Account Created`,
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
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .section { margin-bottom: 20px; }
            .code-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; text-align: center; }
            .code-label { font-size: 12px; color: #999; margin-bottom: 10px; }
            .code-value { font-size: 18px; font-weight: bold; color: #333; letter-spacing: 2px; font-family: 'Courier New', monospace; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
            .warning { background: #fee; border: 1px solid #f99; color: #c33; padding: 12px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
            .expiry { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
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

              <div class="section">
                <p><strong>Or use the link below:</strong></p>
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>

              <div class="expiry">
                <strong>⏱️ Important:</strong> This reset code will expire in 15 minutes. You must complete the password reset within this time.
              </div>

              <div class="section">
                <p><strong>To reset your password:</strong></p>
                <ol>
                  <li>Copy the code above or click the link</li>
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
1. Copy the code above
2. Enter your new password
3. Log in with your new password

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
