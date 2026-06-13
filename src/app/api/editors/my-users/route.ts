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
    const connections = await db.editorUserConnection.findMany({
      where: {
        editorId: session.user.id,
        status: 'ACTIVE',
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

    const connectionsWithProjectCount = await Promise.all(
      connections.map(async (c) => {
        // Count active video assignments between this user and this editor
        const activeProjectsCount = await db.videoAssignment.count({
          where: {
            userId: c.userId,
            editorId: session.user.id,
            status: {
              notIn: ['COMPLETED', 'APPROVED', 'REJECTED'],
            },
          },
        });

        return {
          id: c.id,
          userId: c.userId,
          editorId: c.editorId,
          connectionCode: c.connectionCode,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
          connectedAt: c.connectedAt.toISOString(),
          disconnectedAt: c.disconnectedAt?.toISOString() || null,
          user: c.user,
          activeProjects: activeProjectsCount,
        };
      })
    );

    return NextResponse.json({ connections: connectionsWithProjectCount });
  } catch (error) {
    console.error('[EDITORS/MY-USERS] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve connected clients.' }, { status: 500 });
  }
}
