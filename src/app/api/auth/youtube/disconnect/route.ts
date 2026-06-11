import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log(`[YOUTUBE_DISCONNECT] Deleting YouTube account connection for user ${session.user.id}`);
    
    await db.socialAccount.deleteMany({
      where: {
        userId: session.user.id,
        platform: 'youtube',
      },
    });

    return NextResponse.json({ success: true, message: 'Account disconnected successfully.' });
  } catch (error) {
    console.error('[YOUTUBE_DISCONNECT] Error deleting account connection:', error);
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
  }
}
