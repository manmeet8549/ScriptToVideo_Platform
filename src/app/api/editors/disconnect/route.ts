import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/admin';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { connectionId, editorId } = await request.json();

    let connection;

    if (connectionId) {
      connection = await db.editorUserConnection.findUnique({
        where: { id: connectionId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          editor: { select: { id: true, name: true, email: true } },
        },
      });
    } else if (editorId) {
      connection = await db.editorUserConnection.findUnique({
        where: {
          userId_editorId: {
            userId: session.user.id,
            editorId: editorId,
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          editor: { select: { id: true, name: true, email: true } },
        },
      });
    }

    if (!connection) {
      // Fallback: If disconnected from editor side, the active session user is connection.editorId
      // Let's check if there is a connection where session.user.id is editorId and the other is userId
      if (editorId) {
        connection = await db.editorUserConnection.findUnique({
          where: {
            userId_editorId: {
              userId: editorId, // the other user
              editorId: session.user.id, // the active editor
            },
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            editor: { select: { id: true, name: true, email: true } },
          },
        });
      }
    }

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
    }

    // Check permissions: actor must be the user, the editor, or an admin
    const isUserOfConnection = connection.userId === session.user.id;
    const isEditorOfConnection = connection.editorId === session.user.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');

    if (!isUserOfConnection && !isEditorOfConnection && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (connection.status === 'DISCONNECTED') {
      return NextResponse.json({ success: true, message: 'Already disconnected.' });
    }

    if (connection.status === 'BLOCKED' && !isAdmin) {
      return NextResponse.json({ error: 'Cannot modify a blocked connection.' }, { status: 400 });
    }

    // Disconnect connection
    const updated = await db.editorUserConnection.update({
      where: { id: connection.id },
      data: {
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
      },
    });

    // Log action
    await logActivity(session.user.id, 'EDITOR_DISCONNECTED', isUserOfConnection ? connection.editorId : connection.userId, {
      connectionId: connection.id,
    });

    // Create notifications for both parties
    const userName = connection.user.name || 'Client';
    const editorName = connection.editor.name || 'Editor';

    await db.$transaction([
      db.notification.create({
        data: {
          userId: connection.userId,
          title: 'Editor Disconnected',
          message: `Connection with editor ${editorName} (${connection.editor.email}) has been disconnected.`,
        },
      }),
      db.notification.create({
        data: {
          userId: connection.editorId,
          title: 'User Disconnected',
          message: `Connection with client ${userName} (${connection.user.email}) has been disconnected.`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Connection disconnected successfully.',
      connection: updated,
    });
  } catch (error) {
    console.error('[EDITORS/DISCONNECT] Error:', error);
    return NextResponse.json({ error: 'Failed to disconnect.' }, { status: 500 });
  }
}
