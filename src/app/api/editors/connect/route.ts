import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/admin';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure role is USER or ADMIN
  if (session.user.role !== 'USER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { editorKey } = await request.json();

    if (!editorKey?.trim()) {
      return NextResponse.json({ error: 'Editor connection code is required.' }, { status: 400 });
    }

    const trimmedKey = editorKey.trim();

    // 1. Find the editor profile with the given key
    const editorProfile = await db.editorProfile.findUnique({
      where: { editorKey: trimmedKey },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            accountStatus: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!editorProfile || !editorProfile.user || editorProfile.user.deletedAt) {
      return NextResponse.json({ error: 'Invalid Editor Connection Code.' }, { status: 400 });
    }

    const editorUser = editorProfile.user;

    // Reject paused, stopped or deleted editors
    if (editorUser.accountStatus === 'DELETED') {
      return NextResponse.json({ error: 'Invalid Editor Connection Code.' }, { status: 400 });
    }

    if (editorUser.accountStatus === 'PAUSED') {
      return NextResponse.json({ error: 'This editor account is currently paused.' }, { status: 400 });
    }

    if (editorUser.accountStatus === 'STOPPED') {
      return NextResponse.json({ error: 'This editor account is currently stopped.' }, { status: 400 });
    }

    // A user cannot connect to themselves
    if (editorUser.id === session.user.id) {
      return NextResponse.json({ error: 'You cannot connect to yourself.' }, { status: 400 });
    }

    // 2. Check if a connection already exists
    const existingConnection = await db.editorUserConnection.findUnique({
      where: {
        userId_editorId: {
          userId: session.user.id,
          editorId: editorUser.id,
        },
      },
    });

    let connection;

    if (existingConnection) {
      if (existingConnection.status === 'ACTIVE') {
        return NextResponse.json({
          success: true,
          message: 'You are already connected to this editor.',
          connection: existingConnection,
        });
      }

      if (existingConnection.status === 'BLOCKED') {
        return NextResponse.json(
          { error: 'Connection with this editor is blocked by administrator.' },
          { status: 400 }
        );
      }

      // If DISCONNECTED, restore connection as ACTIVE directly
      connection = await db.editorUserConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: 'ACTIVE',
          connectedAt: new Date(),
          connectionCode: trimmedKey,
        },
      });

      // Log action: RESTORED
      await logActivity(session.user.id, 'CONNECTION_RESTORED', editorUser.id, { connectionCode: trimmedKey });
    } else {
      // Create new connection as ACTIVE directly
      connection = await db.editorUserConnection.create({
        data: {
          userId: session.user.id,
          editorId: editorUser.id,
          connectionCode: trimmedKey,
          status: 'ACTIVE',
        },
      });

      // Log action: CREATED
      await logActivity(session.user.id, 'CONNECTION_CREATED', editorUser.id, { connectionCode: trimmedKey });
    }

    // 3. Create notifications
    const userName = session.user.name || 'A client';
    const editorName = editorUser.name || 'Video Editor';

    await db.$transaction([
      db.notification.create({
        data: {
          userId: session.user.id,
          title: 'Editor Connected',
          message: `You are now connected with editor ${editorName} (${editorUser.email}).`,
        },
      }),
      db.notification.create({
        data: {
          userId: editorUser.id,
          title: 'New Client Connected',
          message: `${userName} (${session.user.email}) has connected with you.`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully connected to editor ${editorName}!`,
      connection,
    });
  } catch (error) {
    console.error('[EDITORS/CONNECT] Error:', error);
    return NextResponse.json({ error: 'Failed to connect editor.' }, { status: 500 });
  }
}
