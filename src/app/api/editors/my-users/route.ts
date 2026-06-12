import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure caller is an EDITOR or ADMIN
  if (session.user.role !== 'EDITOR' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const connections = await db.editorConnection.findMany({
      where: {
        editorId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('[EDITORS/MY-USERS] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve connected clients.' }, { status: 500 });
  }
}
