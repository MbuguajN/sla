'use server'

import { syncGmailTickets } from '@/lib/gmail-engine';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function syncGmailAction() {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    const result = await syncGmailTickets();
    
    revalidatePath('/client-service/tickets');
    revalidatePath('/tasks');
    
    return { 
      success: true, 
      processed: result.processed,
      message: `Successfully processed ${result.processed} messages.` 
    };
  } catch (error: any) {
    console.error('Sync Action Error:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred during sync.' 
    };
  }
}
