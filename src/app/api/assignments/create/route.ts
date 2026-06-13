import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/admin';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role || '');
  if (session.user.role !== 'USER' && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { videoId, editorId, notes } = await request.json();

    if (!videoId || !editorId) {
      return NextResponse.json({ error: 'videoId and editorId are required.' }, { status: 400 });
    }

    // 1. Verify video ownership and check status
    const video = await db.video.findFirst({
      where: isAdmin ? { id: videoId } : { id: videoId, userId: session.user.id },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found or access denied.' }, { status: 404 });
    }

    if (video.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Only completed videos can be assigned to editors.' }, { status: 400 });
    }

    // 2. Verify connection status
    const connection = await db.editorUserConnection.findUnique({
      where: {
        userId_editorId: {
          userId: video.userId,
          editorId,
        },
      },
      include: {
        editor: {
          select: {
            name: true,
            accountStatus: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!connection || connection.status !== 'ACTIVE' || connection.editor.deletedAt || connection.editor.accountStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'There is no active editor connection with this editor.' }, { status: 400 });
    }

    // 3. Check if an assignment already exists for this video
    const existing = await db.videoAssignment.findFirst({
      where: {
        videoId,
        editorId,
        status: { notIn: ['REJECTED', 'APPROVED'] },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'An active assignment already exists for this video with this editor.' }, { status: 400 });
    }

    // 4. Create assignment
    const assignment = await db.videoAssignment.create({
      data: {
        videoId,
        userId: video.userId,
        editorId,
        notes: notes?.trim() || null,
        status: 'PENDING',
        progress: 0,
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            videoUrl: true,
            thumbnailUrl: true,
          },
        },
        user: { select: { name: true, email: true } },
        editor: { select: { name: true, email: true } },
        editedVideos: true,
      },
    });

    // 5. Log activity
    await logActivity(session.user.id, 'ASSIGNMENT_CREATED', editorId, {
      videoId,
      assignmentId: assignment.id,
    });

    // 6. Create notification for editor
    const userName = session.user.name || 'A client';
    await db.notification.create({
      data: {
        userId: editorId,
        title: 'New Assignment',
        message: `${userName} (${session.user.email}) has assigned a video "${video.title}" to you.`,
      },
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error('[ASSIGNMENTS/CREATE] Error:', error);
    return NextResponse.json({ error: 'Failed to create assignment.' }, { status: 500 });
  }
}
