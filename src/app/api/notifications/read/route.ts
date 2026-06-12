import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { ids, all } = await req.json().catch(() => ({ ids: null, all: false }));

    if (all) {
      await db.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
    } else if (Array.isArray(ids) && ids.length > 0) {
      await db.notification.updateMany({
        where: {
          id: { in: ids },
          userId: session.user.id,
        },
        data: { read: true },
      });
    } else {
      // If nothing is provided, mark all as read by default
      await db.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/NOTIFICATIONS/READ] Error:', error);
    return NextResponse.json({ error: 'Failed to update notifications.' }, { status: 500 });
  }
}
