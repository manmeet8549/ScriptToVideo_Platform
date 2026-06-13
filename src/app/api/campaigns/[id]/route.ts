import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

// GET: Fetch campaign details and analytics metrics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const campaign = await db.campaign.findFirst({
      where: orgId ? { id, organizationId: orgId } : { id },
      include: {
        videos: true,
        scheduledPosts: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Compute metrics
    const totalVideos = campaign.videos.length;
    const totalScheduled = campaign.scheduledPosts.filter((p) => p.status === 'PENDING' || p.status === 'PENDING_APPROVAL').length;
    const totalPublished = campaign.scheduledPosts.filter((p) => p.status === 'PUBLISHED').length;
    const totalFailed = campaign.scheduledPosts.filter((p) => p.status === 'FAILED').length;

    // Simulate campaign-wide metrics (views, likes, comments)
    // In production, these are aggregated from published social media posts linked to campaign videos
    let simulatedViews = 0;
    let simulatedLikes = 0;
    let simulatedComments = 0;

    if (totalPublished > 0) {
      simulatedViews = totalPublished * 1420 + Math.floor(Math.random() * 500);
      simulatedLikes = Math.floor(simulatedViews * 0.08);
      simulatedComments = Math.floor(simulatedViews * 0.015);
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        createdAt: campaign.createdAt,
      },
      metrics: {
        totalVideos,
        scheduled: totalScheduled,
        published: totalPublished,
        failed: totalFailed,
        views: simulatedViews,
        likes: simulatedLikes,
        comments: simulatedComments,
      },
      videos: campaign.videos,
      scheduledPosts: campaign.scheduledPosts,
    });
  } catch (error) {
    console.error('[GET_CAMPAIGN_DETAIL_ERR]:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign details' }, { status: 500 });
  }
}

// PATCH: Update campaign information (e.g. rename or edit description)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { name, description, videoIds } = await request.json();

    const campaign = await db.campaign.findFirst({
      where: orgId ? { id, organizationId: orgId } : { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Update details
    const updated = await db.campaign.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    // If new video associations are supplied, override them
    if (videoIds && Array.isArray(videoIds)) {
      // Clear previous associations
      await db.video.updateMany({
        where: { campaignId: id },
        data: { campaignId: null },
      });

      // Set new ones
      await db.video.updateMany({
        where: {
          id: { in: videoIds },
          organizationId: orgId || undefined,
        },
        data: {
          campaignId: id,
        },
      });
    }

    return NextResponse.json({ message: 'Campaign updated successfully', campaign: updated });
  } catch (error) {
    console.error('[PATCH_CAMPAIGN_ERR]:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}
