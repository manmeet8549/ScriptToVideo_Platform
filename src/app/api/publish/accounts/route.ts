import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accounts = await db.socialAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        platform: true,
        email: true,
        channelName: true,
        connectedAt: true,
      },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('[PUBLISH_ACCOUNTS] Error listing accounts:', error);
    return NextResponse.json({ error: 'Failed to retrieve social accounts' }, { status: 500 });
  }
}
