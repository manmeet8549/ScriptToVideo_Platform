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
    const { assignmentId, progress, estimatedHours } = await request.json();

    if (!assignmentId || progress === undefined) {
      return NextResponse.json({ error: 'assignmentId and progress are required.' }, { status: 400 });
    }

    const progInt = parseInt(progress, 10);
    if (isNaN(progInt) || progInt < 0 || progInt > 100) {
      return NextResponse.json({ error: 'Progress must be an integer between 0 and 100.' }, { status: 400 });
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

    const allowedStatuses = ['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'];
    if (!allowedStatuses.includes(assignment.status)) {
      return NextResponse.json({ error: 'Cannot update progress on an inactive or completed assignment.' }, { status: 400 });
    }

    // Determine target status
    let targetStatus = assignment.status;
    if (assignment.status === 'ACCEPTED') {
      targetStatus = 'IN_PROGRESS';
    }

    // Update assignment
    const updated = await db.videoAssignment.update({
      where: { id: assignmentId },
      data: {
        progress: progInt,
        estimatedHours: estimatedHours !== undefined ? (estimatedHours ? parseInt(estimatedHours, 10) : null) : undefined,
        status: targetStatus,
      },
    });

    // Log activity
    await logActivity(session.user.id, 'ASSIGNMENT_PROGRESS_UPDATED', assignment.userId, {
      assignmentId,
      progress: progInt,
      estimatedHours,
    });

    // Create user notification
    const editorName = assignment.editor.name || 'Editor';
    await db.notification.create({
      data: {
        userId: assignment.userId,
        title: 'Assignment Progress Update',
        message: `${editorName} updated progress on "${assignment.video.title}" to ${progInt}%.${estimatedHours ? ` ETA: ${estimatedHours} hours.` : ''}`,
      },
    });

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error) {
    console.error('[ASSIGNMENTS/PROGRESS] Error:', error);
    return NextResponse.json({ error: 'Failed to update progress.' }, { status: 500 });
  }
}
