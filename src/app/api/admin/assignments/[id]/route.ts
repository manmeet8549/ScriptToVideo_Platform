import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/admin';

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await props.params;
  if (!id) {
    return NextResponse.json({ error: 'Assignment ID is required.' }, { status: 400 });
  }

  try {
    const { action, editorId } = await request.json();

    if (!action || !['CANCEL', 'REASSIGN'].includes(action)) {
      return NextResponse.json({ error: 'Valid action (CANCEL or REASSIGN) is required.' }, { status: 400 });
    }

    const assignment = await db.videoAssignment.findUnique({
      where: { id },
      include: {
        video: { select: { title: true } },
        editor: { select: { name: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    if (action === 'CANCEL') {
      // Cancel changes status to REJECTED (terminal state before deletion/reassignment)
      const updated = await db.videoAssignment.update({
        where: { id },
        data: { status: 'REJECTED' },
      });

      // Log activity
      await logActivity(session.user.id, 'ASSIGNMENT_CANCELLED', assignment.userId, {
        assignmentId: id,
      });

      // Notify user and editor
      await db.notification.createMany({
        data: [
          {
            userId: assignment.userId,
            title: 'Assignment Cancelled',
            message: `Admin has cancelled the assignment for "${assignment.video.title}".`,
          },
          {
            userId: assignment.editorId,
            title: 'Assignment Cancelled',
            message: `Admin has cancelled the assignment for "${assignment.video.title}" that was assigned to you.`,
          },
        ],
      });

      return NextResponse.json({ success: true, assignment: updated });
    } else if (action === 'REASSIGN') {
      if (!editorId) {
        return NextResponse.json({ error: 'editorId is required for REASSIGN action.' }, { status: 400 });
      }

      // Verify connection exists between this client (assignment.userId) and the new editor
      const connection = await db.editorUserConnection.findUnique({
        where: {
          userId_editorId: {
            userId: assignment.userId,
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
        return NextResponse.json({
          error: 'The new editor does not have an active connection with the client of this video.',
        }, { status: 400 });
      }

      const oldEditorId = assignment.editorId;

      // Update assignment with new editor, reset progress and status to PENDING
      const updated = await db.videoAssignment.update({
        where: { id },
        data: {
          editorId,
          status: 'PENDING',
          progress: 0,
          estimatedHours: null,
        },
        include: {
          editor: { select: { name: true } },
        },
      });

      // Log activity
      await logActivity(session.user.id, 'ASSIGNMENT_REASSIGNED', assignment.userId, {
        assignmentId: id,
        fromEditorId: oldEditorId,
        toEditorId: editorId,
      });

      // Notify the old editor
      await db.notification.create({
        data: {
          userId: oldEditorId,
          title: 'Assignment Reassigned',
          message: `The assignment for "${assignment.video.title}" has been reassigned to another editor by Admin.`,
        },
      });

      // Notify the new editor
      await db.notification.create({
        data: {
          userId: editorId,
          title: 'New Assignment',
          message: `Admin has reassigned a video "${assignment.video.title}" to you.`,
        },
      });

      // Notify the client/user
      const newEditorName = updated.editor.name || 'a different editor';
      await db.notification.create({
        data: {
          userId: assignment.userId,
          title: 'Assignment Editor Changed',
          message: `Admin has reassigned your assignment for "${assignment.video.title}" to ${newEditorName}.`,
        },
      });

      return NextResponse.json({ success: true, assignment: updated });
    }

    return NextResponse.json({ error: 'Invalid operation.' }, { status: 400 });
  } catch (error) {
    console.error('[ADMIN/ASSIGNMENTS/MANAGE] Error:', error);
    return NextResponse.json({ error: 'Failed to manage assignment.' }, { status: 500 });
  }
}
