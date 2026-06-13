import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

// PATCH: Approve, Reject, or Request Changes on an approval request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied. Admin permissions required.' }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization context required.' }, { status: 400 });
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { status, feedback } = await request.json();

    if (!id || !status || !['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(status)) {
      return NextResponse.json({ error: 'id, status (APPROVED|REJECTED|CHANGES_REQUESTED) are required' }, { status: 400 });
    }

    // Find the approval request
    const approval = await db.approvalRequest.findFirst({
      where: { id, organizationId: orgId },
      include: { video: true },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Approval request not found.' }, { status: 404 });
    }

    // Update approval request
    const updatedApproval = await db.approvalRequest.update({
      where: { id },
      data: {
        status,
        feedback: feedback || null,
        actionedAt: new Date(),
        actionedById: session.user.id,
      },
    });

    // Notify the user who requested approval
    await db.notification.create({
      data: {
        userId: approval.userId,
        title: `Approval: ${status.replace('_', ' ')}`,
        message: `Your approval request for video "${approval.video.title}" has been ${status.toLowerCase().replace('_', ' ')}. Feedback: "${feedback || 'None'}"`,
        type: `APPROVAL_${status}`,
      },
    });

    if (status === 'APPROVED') {
      // 1. Update any pending scheduled posts to PENDING (releasing them to run)
      await db.scheduledPost.updateMany({
        where: {
          organizationId: orgId,
          videoId: approval.videoId,
          status: 'PENDING_APPROVAL',
        },
        data: {
          status: 'PENDING',
        },
      });

      // 2. Trigger IF-THEN automation rules (e.g. IF Approved THEN schedule for tomorrow 9 AM)
      const rules = await db.automationRule.findMany({
        where: { organizationId: orgId, triggerEvent: 'VIDEO_APPROVED', active: true },
      });

      for (const rule of rules) {
        if (rule.actionType === 'SCHEDULE_TOMORROW_9AM') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);

          // Find scheduled posts that are pending and update their scheduledFor date
          await db.scheduledPost.updateMany({
            where: {
              organizationId: orgId,
              videoId: approval.videoId,
              status: 'PENDING',
            },
            data: {
              scheduledFor: tomorrow,
            },
          });
        }
      }
    } else {
      // If REJECTED or CHANGES_REQUESTED:
      // 1. Refund credit to the user who requested
      const scheduledPosts = await db.scheduledPost.findMany({
        where: {
          organizationId: orgId,
          videoId: approval.videoId,
          status: 'PENDING_APPROVAL',
        },
      });

      if (scheduledPosts.length > 0) {
        const { addCredits } = await import('@/lib/credits');
        await addCredits(approval.userId, 'PUBLISH', scheduledPosts.length, 'SYSTEM');

        // 2. Delete those scheduled posts
        await db.scheduledPost.deleteMany({
          where: {
            organizationId: orgId,
            videoId: approval.videoId,
            status: 'PENDING_APPROVAL',
          },
        });
      }
    }

    return NextResponse.json({ message: `Approval request updated to ${status}`, approval: updatedApproval });
  } catch (error) {
    console.error('[PATCH_APPROVAL_ERR]:', error);
    return NextResponse.json({ error: 'Failed to update approval status' }, { status: 500 });
  }
}
