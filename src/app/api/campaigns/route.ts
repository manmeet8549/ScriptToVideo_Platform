import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

// GET: List all campaigns
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const userId = session.user.id;

  try {
    const whereClause = orgId ? { organizationId: orgId } : { organizationId: 'default' };
    const campaigns = await db.campaign.findMany({
      where: whereClause,
      include: {
        videos: {
          select: {
            id: true,
            title: true,
            videoUrl: true,
            thumbnailUrl: true,
          },
        },
        scheduledPosts: {
          select: {
            id: true,
            status: true,
            platform: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('[GET_CAMPAIGNS_ERR]:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST: Create a new campaign
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  try {
    const { name, description, videoIds } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Create the campaign
    const campaign = await db.campaign.create({
      data: {
        organizationId: orgId || 'default',
        name,
        description: description || null,
      },
    });

    // If videos are supplied, associate them
    if (videoIds && Array.isArray(videoIds) && videoIds.length > 0) {
      await db.video.updateMany({
        where: {
          id: { in: videoIds },
          organizationId: orgId || undefined,
        },
        data: {
          campaignId: campaign.id,
        },
      });
    }

    return NextResponse.json({ message: 'Campaign created successfully', campaign });
  } catch (error) {
    console.error('[POST_CAMPAIGN_ERR]:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

// DELETE: Remove a campaign folder (disconnects linked videos instead of deleting them)
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const campaign = await db.campaign.findFirst({
      where: orgId ? { id, organizationId: orgId } : { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found or access denied.' }, { status: 404 });
    }

    // Disconnect videos first
    await db.video.updateMany({
      where: { campaignId: id },
      data: { campaignId: null },
    });

    // Disconnect scheduled posts
    await db.scheduledPost.updateMany({
      where: { campaignId: id },
      data: { campaignId: null },
    });

    // Delete campaign
    await db.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Campaign deleted successfully.' });
  } catch (error) {
    console.error('[DELETE_CAMPAIGN_ERR]:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
