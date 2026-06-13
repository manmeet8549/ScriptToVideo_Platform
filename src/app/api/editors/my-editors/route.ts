import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connections = await db.editorUserConnection.findMany({
      where: {
        userId: session.user.id,
        status: 'ACTIVE',
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
                editorKey: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Dynamically calculate editor active workload (assigned projects not completed/approved/rejected)
    const connectionsWithWorkload = await Promise.all(
      connections.map(async (c) => {
        const activeAssignmentsCount = await db.videoAssignment.count({
          where: {
            editorId: c.editorId,
            status: {
              notIn: ['COMPLETED', 'APPROVED', 'REJECTED'],
            },
          },
        });
        return {
          id: c.id,
          editorId: c.editorId,
          userId: c.userId,
          connectionCode: c.connectionCode,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
          connectedAt: c.connectedAt.toISOString(),
          disconnectedAt: c.disconnectedAt?.toISOString() || null,
          editor: c.editor,
          workload: activeAssignmentsCount,
        };
      })
    );

    return NextResponse.json({ connections: connectionsWithWorkload });
  } catch (error) {
    console.error('[EDITORS/MY-EDITORS] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve connected editors.' }, { status: 500 });
  }
}
