'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function saveSystemSettings(settings: Record<string, string>) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return { success: false, error: 'Authentication session expired or invalid' }
    }

    const role = (session.user as any)?.role

    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized operational clearance' }
    }

    const gmailFields = ['gmailClientId', 'gmailClientSecret', 'gmailRefreshToken', 'monitoredEmail'];
    const updateData: any = {};
    const kvEntries: [string, string][] = [];

    Object.entries(settings).forEach(([key, value]) => {
      if (gmailFields.includes(key)) {
        updateData[key] = value;
      } else {
        kvEntries.push([key, value]);
      }
    });

    if (Object.keys(updateData).length > 0) {
      await (prisma.systemSettings as any).upsert({
        where: { key: 'GMAIL_CONFIG' },
        update: updateData,
        create: { key: 'GMAIL_CONFIG', value: 'CONFIGURED', ...updateData }
      });
    }

    if (kvEntries.length > 0) {
      await Promise.all(
        kvEntries.map(([key, value]) =>
          (prisma.systemSettings as any).upsert({
            where: { key },
            update: { value },
            create: { key, value }
          })
        )
      )
    }

    revalidatePath('/admin/settings/gmail')
    return { success: true }
  } catch (error: any) {
    console.error('CRITICAL ERROR in saveSystemSettings:', error);
    return { success: false, error: `CRITICAL ERROR: ${error.message || 'Unknown operational failure'}` }
  }
}

export async function getSystemSettings(keys: string[]) {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: { 
        OR: [
          { key: { in: keys } },
          { key: 'GMAIL_CONFIG' },
          { key: { in: keys.map(k => k.toUpperCase()) } }
        ]
      }
    })

    const resultMap: Record<string, string> = {}
    keys.forEach(k => { resultMap[k] = '' });

    settings.forEach((s: any) => {
      if (s.key === 'GMAIL_CONFIG') {
         if (s.gmailClientId) resultMap['gmailClientId'] = s.gmailClientId;
         if (s.gmailClientSecret) resultMap['gmailClientSecret'] = s.gmailClientSecret;
         if (s.gmailRefreshToken) resultMap['gmailRefreshToken'] = s.gmailRefreshToken;
         if (s.monitoredEmail) resultMap['monitoredEmail'] = s.monitoredEmail;
      } else {
        resultMap[s.key] = s.value;
        resultMap[s.key.toLowerCase()] = s.value;
        if (s.key === 'GMAIL_CLIENT_ID') resultMap['gmailClientId'] = s.value;
        if (s.key === 'GMAIL_CLIENT_SECRET') resultMap['gmailClientSecret'] = s.value;
        if (s.key === 'GMAIL_REFRESH_TOKEN') resultMap['gmailRefreshToken'] = s.value;
        if (s.key === 'GMAIL_MONITORED_EMAIL') resultMap['monitoredEmail'] = s.value;
      }
    })

    return resultMap
  } catch (error) {
    console.error('Error in getSystemSettings:', error);
    return {}
  }
}
