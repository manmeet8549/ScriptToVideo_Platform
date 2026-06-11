import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Verify ownership
    const account = await db.socialAccount.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found or access denied.' }, { status: 404 });
    }

    // Delete connection
    await db.socialAccount.delete({
      where: {
        id,
      },
    });

    console.log(`[PUBLISH_DISCONNECT] User ${session.user.id} disconnected social account: ${account.platform} - ${account.channelName}`);
    return NextResponse.json({ success: true, message: 'Account disconnected successfully.' });
  } catch (error) {
    console.error('[PUBLISH_DISCONNECT] Error deleting account connection:', error);
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
  }
}
