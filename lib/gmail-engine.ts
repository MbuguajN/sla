import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import prisma from './db';
import fs from 'fs';
import path from 'path';

export async function getGmailClient() {
  const settings = await (prisma.systemSettings as any).findUnique({
    where: { key: 'GMAIL_CONFIG' }
  });
  
  if (!settings || !settings.gmailClientId || !settings.gmailClientSecret || !settings.gmailRefreshToken) {
    throw new Error('Gmail configuration missing in SystemSettings');
  }

  const oauth2Client = new google.auth.OAuth2(
    settings.gmailClientId,
    settings.gmailClientSecret,
    'http://localhost:3000/api/auth/callback/google' // This is just a placeholder
  );

  oauth2Client.setCredentials({
    refresh_token: settings.gmailRefreshToken,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function syncGmailTickets() {
  const gmail = await getGmailClient();
  const settings = await (prisma.systemSettings as any).findUnique({
    where: { key: 'GMAIL_CONFIG' }
  });
  const monitoredEmail = settings?.monitoredEmail || 'me';

  console.log(`[GMAIL-SYNC] Starting sync for ${monitoredEmail}...`);

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `to:${monitoredEmail} is:unread`,
  });

  const messages = res.data.messages || [];
  console.log(`[GMAIL-SYNC] Found ${messages.length} unread messages.`);

  for (const message of messages) {
    const msgRes = await gmail.users.messages.get({
      userId: 'me',
      id: message.id!,
    });

    const msg = msgRes.data;
    const threadId = msg.threadId!;
    const subject = msg.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = msg.payload?.headers?.find(h => h.name === 'From')?.value || 'Unknown';
    const body = getMessageBody(msg.payload);
    
    // Check if task exists for this thread
    let task = await (prisma.task as any).findUnique({
      where: { gmailThreadId: threadId },
    });

    if (task) {
      // Append as comment (Message model in this schema)
      await prisma.message.create({
        data: {
          taskId: task.id,
          content: `Re: ${subject}\n\nFrom: ${from}\n\n${body}`,
          authorId: 1, // System or default admin user
        },
      });
    } else {
      // Parse From header: "Name <email@example.com>" or "email@example.com"
      const fromMatch = from.match(/(?:(?:"?([^"]*)"?\s)?<([^>]+)>|([^\s]+))/);
      const senderName = fromMatch?.[1] || fromMatch?.[3] || null;
      const senderEmail = fromMatch?.[2] || fromMatch?.[3] || from;

      // Create new task
      task = await (prisma.task as any).create({
        data: {
          title: subject,
          description: body,
          isTicket: true,
          gmailThreadId: threadId,
          slaId: 1, // Standard SLA by default
          status: 'PENDING',
          senderName,
          senderEmail,
        },
      });
    }
    
    console.log(`[GMAIL-SYNC] Processed message ${message.id} (Thread: ${threadId}) - Task ID: ${task.id}`);

    // Handle attachments
    if (task) {
      await handleAttachments(gmail, msg, task.id);
    }

    // Mark as read
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: [message.id!],
        removeLabelIds: ['UNREAD'],
      },
    });
  }

  await (prisma.systemSettings as any).updateMany({
    data: { lastSyncAt: new Date() },
  });

  console.log(`[GMAIL-SYNC] Sync complete. Processed ${messages.length} messages.`);
  return { processed: messages.length };
}

function getMessageBody(payload: any): string {
  let body = '';
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain') {
        body += Buffer.from(part.body.data, 'base64').toString();
      } else if (part.parts) {
        body += getMessageBody(part);
      }
    }
  } else if (payload.body && payload.body.data) {
    body = Buffer.from(payload.body.data, 'base64').toString();
  }
  return body || 'No content';
}

async function handleAttachments(gmail: any, msg: any, taskId: number) {
  if (!msg.payload.parts) return;

  const uploadDir = path.join(process.cwd(), 'public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  for (const part of msg.payload.parts) {
    if (part.filename && part.body.attachmentId) {
      const attachRes = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: msg.id,
        id: part.body.attachmentId,
      });

      const data = Buffer.from(attachRes.data.data, 'base64');
      const filename = `${Date.now()}-${part.filename}`;
      const filePath = path.join(uploadDir, filename);

      fs.writeFileSync(filePath, data);

      await (prisma as any).attachment.create({
        data: {
          taskId,
          name: part.filename,
          url: `/uploads/${filename}`,
          size: part.body.size,
          mimeType: part.mimeType,
        },
      });
    }
  }
}
