import { NextResponse } from 'next/server';
import { syncGmailTickets } from '@/lib/gmail-engine';

export async function GET() {
  try {
    const result = await syncGmailTickets();
    return NextResponse.json({ 
      success: true, 
      message: `Synced ${result.processed} messages`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Gmail Sync Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
