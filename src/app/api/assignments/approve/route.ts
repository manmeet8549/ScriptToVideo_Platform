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
    const { assignmentId } = await request.json();

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required.' }, { status: 400 });
    }

    const assignment = await db.videoAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        video: { select: { id: true, title: true, projectId: true } },
        user: { select: { name: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    // Verify caller is the owner (client) or an admin
    if (assignment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (assignment.status !== 'REVIEW') {
      return NextResponse.json({ error: 'Assignment must be in review to be approved.' }, { status: 400 });
    }

    // Find the latest EditedVideo
    const latestEdit = await db.editedVideo.findFirst({
      where: { assignmentId },
      orderBy: { version: 'desc' },
    });

    if (!latestEdit) {
      return NextResponse.json({ error: 'No edited videos found for this assignment.' }, { status: 400 });
    }

    // Update Video, Project, and Assignment in a transaction
    await db.$transaction(async (tx) => {
      // 1. Update original Video record
      await tx.video.update({
        where: { id: assignment.videoId },
        data: {
          r2Key: latestEdit.editedVideoKey,
          videoUrl: latestEdit.editedVideoUrl,
          thumbnailUrl: latestEdit.thumbnailUrl || undefined,
          thumbnailKey: latestEdit.thumbnailKey || undefined,
        },
      });

      // 2. Update parent Project record
      await tx.project.update({
        where: { id: assignment.video.projectId },
        data: {
          videoUrl: latestEdit.editedVideoUrl,
        },
      });

      // 3. Complete and approve assignment
      await tx.videoAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'APPROVED',
          completedAt: new Date(),
        },
      });
    });

    // Log activity
    await logActivity(session.user.id, 'ASSIGNMENT_APPROVED', assignment.editorId, {
      assignmentId,
      editedVideoId: latestEdit.id,
      version: latestEdit.version,
    });

    // Notify editor
    const userName = assignment.user.name || session.user.name || 'Client';
    await db.notification.create({
      data: {
        userId: assignment.editorId,
        title: 'Assignment Approved',
        message: `${userName} has approved your edits for "${assignment.video.title}". Great job!`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ASSIGNMENTS/APPROVE] Error:', error);
    return NextResponse.json({ error: 'Failed to approve assignment.' }, { status: 500 });
  }
}
