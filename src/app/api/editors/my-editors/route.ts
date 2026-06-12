import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connections = await db.editorConnection.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
            editorProfile: {
              select: {
                displayName: true,
                bio: true,
                skills: true,
                availability: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('[EDITORS/MY-EDITORS] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve connected editors.' }, { status: 500 });
  }
}
