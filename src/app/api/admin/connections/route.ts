import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!session?.user?.id || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const connections = await db.editorUserConnection.findMany({
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
