import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

// POST: Schedule a post
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const orgId = session.user.organizationId;

  try {
    const { videoId, targets, scheduledFor, campaignId } = await request.json();

    if (!videoId || !targets || !Array.isArray(targets) || targets.length === 0 || !scheduledFor) {
      return NextResponse.json({ error: 'videoId, targets, and scheduledFor are required' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledFor date format' }, { status: 400 });
    }

    // 1. Verify video access
    const video = await db.video.findFirst({
      where: orgId ? { id: videoId, organizationId: orgId } : { id: videoId, userId },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found or access denied.' }, { status: 404 });
    }

    // 2. Check and consume publish credits
    const { hasCredits, consumeCredits } = await import('@/lib/credits');
    const sufficient = await hasCredits(userId, 'PUBLISH', targets.length);
    if (!sufficient) {
      return NextResponse.json({ error: 'Insufficient Credits. Contact Administrator.' }, { status: 403 });
    }
    await consumeCredits(userId, 'PUBLISH', targets.length);

    // 3. Resolve if organization requires approvals
    let approvalRequired = false;
    if (orgId) {
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { approvalRequired: true },
      });
      approvalRequired = org?.approvalRequired ?? false;
    }

    // 4. Create ScheduledPosts
    const scheduledPosts = [];
    const status = approvalRequired ? 'PENDING_APPROVAL' : 'PENDING';

    for (const target of targets) {
      const { socialAccountId, platform, title, description, tags, visibility, caption, tweetText } = target;

      // Create a ScheduledPost record
      const post = await db.scheduledPost.create({
        data: {
          organizationId: orgId || video.organizationId || 'default',
          videoId: video.id,
          socialAccountId: socialAccountId || null,
          platform: platform || 'youtube',
          scheduledFor: scheduledDate,
          status,
          campaignId: campaignId || null,
        },
      });
      scheduledPosts.push(post);
    }

    // 5. Create Approval Request if required
    if (approvalRequired) {
      await db.approvalRequest.create({
        data: {
          organizationId: orgId || 'default',
          videoId: video.id,
          userId,
          status: 'PENDING',
          requestedDate: new Date(),
        },
      });

      // Add workflow notification for admin
      await db.notification.create({
        data: {
          userId,
          title: 'Approval Required',
          message: `Approval requested for video: "${video.title}" scheduled for ${scheduledDate.toLocaleDateString()}`,
          type: 'APPROVAL_REQUIRED',
        },
      });
    }

    // 6. Automation Rules Hook
    if (!approvalRequired) {
      // Find automation rules for "VIDEO_APPROVED" or similar triggering
      const rules = orgId ? await db.automationRule.findMany({
        where: { organizationId: orgId, triggerEvent: 'VIDEO_APPROVED', active: true },
      }) : [];
      
      for (const rule of rules) {
        if (rule.actionType === 'PUBLISH_IMMEDIATELY') {
          // Could trigger direct publishing, but scheduledFor is specified so we let the cron agent handle it.
        }
      }
    }

    return NextResponse.json({
      message: approvalRequired ? 'Submitted for Approval' : 'Post Scheduled Successfully',
      scheduledPosts,
      approvalRequired,
    });
  } catch (error) {
    console.error('[SCHEDULE_POST_ERR]:', error);
    return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 });
  }
}

// GET: Fetch scheduled queue for current tenant
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  try {
    const whereClause: any = orgId ? { organizationId: orgId } : { video: { userId } };
    const scheduledPosts = await db.scheduledPost.findMany({
      where: whereClause,
      include: {
        video: {
          select: {
            title: true,
            videoUrl: true,
            thumbnailUrl: true,
            duration: true,
          },
        },
        campaign: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    return NextResponse.json({ scheduledPosts });
  } catch (error) {
    console.error('[GET_SCHEDULED_ERR]:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled queue' }, { status: 500 });
  }
}

// DELETE: Cancel scheduled post (and refund credits)
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const scheduledPost = await db.scheduledPost.findFirst({
      where: orgId ? { id, organizationId: orgId } : { id, video: { userId } },
    });

    if (!scheduledPost) {
      return NextResponse.json({ error: 'Scheduled post not found or access denied.' }, { status: 404 });
    }

    // Refund credit
    const { addCredits } = await import('@/lib/credits');
    await addCredits(userId, 'PUBLISH', 1, 'SYSTEM');

    await db.scheduledPost.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Scheduled post cancelled and credit refunded.' });
  } catch (error) {
    console.error('[DELETE_SCHEDULE_ERR]:', error);
    return NextResponse.json({ error: 'Failed to cancel scheduled post' }, { status: 500 });
  }
}
