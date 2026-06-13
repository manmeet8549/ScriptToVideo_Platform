import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

// GET: List pending approvals for ORG_ADMIN or SUPER_ADMIN
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied. Organization Admin permissions required.' }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization context required.' }, { status: 400 });
  }

  try {
    const approvals = await db.approvalRequest.findMany({
      where: {
        organizationId: orgId,
        status: 'PENDING',
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            videoUrl: true,
            thumbnailUrl: true,
            duration: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        requestedDate: 'desc',
      },
    });

    return NextResponse.json({ approvals });
  } catch (error) {
    console.error('[GET_APPROVALS_ERR]:', error);
    return NextResponse.json({ error: 'Failed to fetch approval queue' }, { status: 500 });
  }
}

// POST: Submit video to approval queue manually
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const orgId = session.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization context required.' }, { status: 400 });
  }

  try {
    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Verify video exists in org
    const video = await db.video.findFirst({
      where: { id: videoId, organizationId: orgId },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found or access denied.' }, { status: 404 });
    }

    // Check if there is already a pending approval request
    const existing = await db.approvalRequest.findFirst({
      where: { videoId, organizationId: orgId, status: 'PENDING' },
    });

    if (existing) {
      return NextResponse.json({ message: 'Approval request already pending', approval: existing });
    }

    const approval = await db.approvalRequest.create({
      data: {
        organizationId: orgId,
        videoId,
        userId,
        status: 'PENDING',
        requestedDate: new Date(),
      },
    });

    // Create system notification for admins
    const admins = await db.user.findMany({
      where: { organizationId: orgId, role: { in: ['ORG_ADMIN', 'SUPER_ADMIN', 'ADMIN'] } },
    });

    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          title: 'Approval Required',
          message: `User ${session.user.name || 'Member'} requested publishing approval for video: "${video.title}"`,
          type: 'APPROVAL_REQUIRED',
        },
      });
    }

    return NextResponse.json({ message: 'Submitted for approval', approval });
  } catch (error) {
    console.error('[POST_APPROVAL_ERR]:', error);
    return NextResponse.json({ error: 'Failed to submit approval request' }, { status: 500 });
  }
}
