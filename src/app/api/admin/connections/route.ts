import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const connections = await db.editorConnection.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        editor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('[ADMIN/CONNECTIONS/GET] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve connections list.' }, { status: 500 });
  }
}
