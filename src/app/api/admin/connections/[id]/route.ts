import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/admin';
import { ConnectionStatus } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  try {
    const { action } = await request.json();

    if (!action || !['DISCONNECT', 'BLOCK', 'RESTORE'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be DISCONNECT, BLOCK, or RESTORE.' }, { status: 400 });
    }

    const connection = await db.editorConnection.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        editor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
    }

    let nextStatus: ConnectionStatus;
    let disconnectedAt: Date | null = connection.disconnectedAt;
    let connectedAt: Date = connection.connectedAt;
    let activityAction = '';

    if (action === 'DISCONNECT') {
      nextStatus = 'DISCONNECTED';
      disconnectedAt = new Date();
      activityAction = 'EDITOR_DISCONNECTED';
    } else if (action === 'BLOCK') {
      nextStatus = 'BLOCKED';
      disconnectedAt = new Date();
      activityAction = 'CONNECTION_BLOCKED';
    } else {
      nextStatus = 'ACTIVE';
      connectedAt = new Date();
      disconnectedAt = null;
      activityAction = 'CONNECTION_RESTORED';
    }

    // Update connection status
    const updated = await db.editorConnection.update({
      where: { id },
      data: {
        status: nextStatus,
        connectedAt,
        disconnectedAt,
      },
    });

    // Log admin activity
    await logActivity(session.user.id, activityAction, connection.editorId, {
      userId: connection.userId,
      connectionId: connection.id,
      byAdmin: true,
    });

    // Send notifications to user and editor
    const userName = connection.user.name || 'Client';
    const editorName = connection.editor.name || 'Editor';

    let userTitle = '';
    let userMessage = '';
    let editorTitle = '';
    let editorMessage = '';

    if (action === 'DISCONNECT') {
      userTitle = 'Editor Disconnected';
      userMessage = `Your connection with editor ${editorName} has been disconnected by the administrator.`;
      editorTitle = 'User Disconnected';
      editorMessage = `Your connection with client ${userName} has been disconnected by the administrator.`;
    } else if (action === 'BLOCK') {
      userTitle = 'Connection Blocked';
      userMessage = `Your connection with editor ${editorName} has been blocked by the administrator.`;
      editorTitle = 'Connection Blocked';
      editorMessage = `Your connection with client ${userName} has been blocked by the administrator.`;
    } else {
      userTitle = 'Connection Restored';
      userMessage = `Your connection with editor ${editorName} has been restored by the administrator.`;
      editorTitle = 'Connection Restored';
      editorMessage = `Your connection with client ${userName} has been restored by the administrator.`;
    }

    await db.$transaction([
      db.notification.create({
        data: {
          userId: connection.userId,
          title: userTitle,
          message: userMessage,
        },
      }),
      db.notification.create({
        data: {
          userId: connection.editorId,
          title: editorTitle,
          message: editorMessage,
        },
      }),
    ]);

    return NextResponse.json({ success: true, connection: updated });
  } catch (error) {
    console.error(`[ADMIN/CONNECTIONS/PATCH] Error for ID ${id}:`, error);
    return NextResponse.json({ error: 'Failed to update connection status.' }, { status: 500 });
  }
}
