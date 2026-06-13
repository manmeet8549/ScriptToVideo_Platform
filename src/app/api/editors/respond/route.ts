import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/admin';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure role is EDITOR or ADMIN
  if (session.user.role !== 'EDITOR' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { connectionId, action } = await request.json();

    if (!connectionId || !action || (action !== 'ACCEPT' && action !== 'REJECT')) {
      return NextResponse.json({ error: 'Invalid parameters. connectionId and action (ACCEPT/REJECT) are required.' }, { status: 400 });
    }

    // 1. Find the connection request
    const connection = await db.editorUserConnection.findUnique({
      where: { id: connectionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        editor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection request not found.' }, { status: 404 });
    }

    // Ensure connection is for this editor (or caller is admin)
    if (connection.editorId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. You do not own this connection request.' }, { status: 403 });
    }

    if (connection.status !== 'PENDING') {
      return NextResponse.json({ error: `Connection request is already in status: ${connection.status}.` }, { status: 400 });
    }

    let updatedConnection;
    const isAccept = action === 'ACCEPT';

    if (isAccept) {
      updatedConnection = await db.editorUserConnection.update({
        where: { id: connectionId },
        data: {
          status: 'ACTIVE',
          connectedAt: new Date(),
        },
      });

      // Log activity
      await logActivity(session.user.id, 'CONNECTION_ACCEPTED', connection.userId, { connectionId });

      // Notifications
      const editorName = connection.editor.name || 'Video Editor';
      const userName = connection.user.name || 'Client';

      await db.$transaction([
        db.notification.create({
          data: {
            userId: connection.userId,
            title: 'Connection Accepted',
            message: `Editor ${editorName} (${connection.editor.email}) has accepted your connection request.`,
          },
        }),
        db.notification.create({
          data: {
            userId: connection.editorId,
            title: 'Connection Activated',
            message: `You are now connected with client ${userName} (${connection.user.email}).`,
          },
        }),
      ]);
    } else {
      updatedConnection = await db.editorUserConnection.update({
        where: { id: connectionId },
        data: {
          status: 'REJECTED',
          disconnectedAt: new Date(),
        },
      });

      // Log activity
      await logActivity(session.user.id, 'CONNECTION_REJECTED', connection.userId, { connectionId });

      // Notification to user
      const editorName = connection.editor.name || 'Video Editor';
      await db.notification.create({
        data: {
          userId: connection.userId,
          title: 'Connection Request Declined',
          message: `Editor ${editorName} (${connection.editor.email}) has declined your connection request.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Connection request ${isAccept ? 'accepted' : 'declined'} successfully.`,
      connection: updatedConnection,
    });
  } catch (error) {
    console.error('[EDITORS/RESPOND] Error:', error);
    return NextResponse.json({ error: 'Failed to respond to connection request.' }, { status: 500 });
  }
}
