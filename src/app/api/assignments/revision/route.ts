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
    const { assignmentId, notes } = await request.json();

    if (!assignmentId || !notes?.trim()) {
      return NextResponse.json({ error: 'assignmentId and notes are required.' }, { status: 400 });
    }

    const assignment = await db.videoAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        video: { select: { title: true } },
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

    const allowedStatuses = ['REVIEW', 'IN_PROGRESS', 'ACCEPTED'];
    if (!allowedStatuses.includes(assignment.status)) {
      return NextResponse.json({ error: 'Revisions can only be requested for active or in-review assignments.' }, { status: 400 });
    }

    // Append revision notes to assignment notes
    const dateStr = new Date().toLocaleDateString();
    const cleanNotes = notes.trim();
    const updatedNotes = assignment.notes
      ? `${assignment.notes}\n\n[Revision Request - ${dateStr}]: ${cleanNotes}`
      : `[Revision Request - ${dateStr}]: ${cleanNotes}`;

    // Update assignment
    const updated = await db.videoAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'REVISION_REQUESTED',
        progress: 0, // Reset progress for the next round
        notes: updatedNotes,
      },
    });

    // Log activity
    await logActivity(session.user.id, 'ASSIGNMENT_REVISION_REQUESTED', assignment.editorId, {
      assignmentId,
      notes: cleanNotes,
    });

    // Notify editor
    const userName = assignment.user.name || session.user.name || 'Client';
    await db.notification.create({
      data: {
        userId: assignment.editorId,
        title: 'Revision Requested',
        message: `${userName} has requested revisions on "${assignment.video.title}". Details: "${cleanNotes.substring(0, 60)}${cleanNotes.length > 60 ? '...' : ''}"`,
      },
    });

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error) {
    console.error('[ASSIGNMENTS/REVISION] Error:', error);
    return NextResponse.json({ error: 'Failed to request revision.' }, { status: 500 });
  }
}
