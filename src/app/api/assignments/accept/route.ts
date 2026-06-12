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
        video: { select: { title: true } },
        editor: { select: { name: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    // Verify caller is the assigned editor
    if (assignment.editorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (assignment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Assignment has already been processed.' }, { status: 400 });
    }

    // Update assignment
    const updated = await db.videoAssignment.update({
      where: { id: assignmentId },
      data: { status: 'ACCEPTED' },
    });

    // Log activity
    await logActivity(session.user.id, 'ASSIGNMENT_ACCEPTED', assignment.userId, {
      assignmentId,
    });

    // Create user notification
    const editorName = assignment.editor.name || 'Editor';
    await db.notification.create({
      data: {
        userId: assignment.userId,
        title: 'Assignment Accepted',
        message: `${editorName} has accepted your assignment for "${assignment.video.title}".`,
      },
    });

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error) {
    console.error('[ASSIGNMENTS/ACCEPT] Error:', error);
    return NextResponse.json({ error: 'Failed to accept assignment.' }, { status: 500 });
  }
}
