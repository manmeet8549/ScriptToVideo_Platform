import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt, encrypt } from '@/lib/encryption';
import { getPublisher } from '@/lib/publishers';

export async function POST(request: NextRequest) {
  return executeAgentCycle(request);
}

export async function GET(request: NextRequest) {
  return executeAgentCycle(request);
}

async function executeAgentCycle(request: NextRequest) {
  console.log('[PUBLISHING_AGENT] Running auto-publishing cycle...');

  // Simple token authorization check if configured, but allow bypass in dev
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    // 1. Fetch PENDING scheduled posts where scheduledFor <= now
    const pendingPosts = await db.scheduledPost.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        video: {
          include: {
            project: true,
          },
        },
        socialAccount: true,
      },
    });

    console.log(`[PUBLISHING_AGENT] Found ${pendingPosts.length} posts to publish.`);

    const results = [];

    for (const post of pendingPosts) {
      const { video, socialAccount } = post;

      if (!video) {
        await db.scheduledPost.update({
          where: { id: post.id },
          data: { status: 'FAILED', errorMessage: 'Associated video not found' },
        });
        results.push({ id: post.id, status: 'FAILED', error: 'Video not found' });
        continue;
      }

      if (!socialAccount) {
        await db.scheduledPost.update({
          where: { id: post.id },
          data: { status: 'FAILED', errorMessage: 'Target social account not found' },
        });
        results.push({ id: post.id, status: 'FAILED', error: 'Social account not found' });
        continue;
      }

      try {
        console.log(`[PUBLISHING_AGENT] Publishing post ${post.id} to ${post.platform} for video "${video.title}"`);

        // Decrypt access tokens
        let accessToken = '';
        let refreshToken: string | null = null;
        try {
          accessToken = decrypt(socialAccount.accessToken);
          refreshToken = socialAccount.refreshToken ? decrypt(socialAccount.refreshToken) : null;
        } catch {
          throw new Error('Failed to decrypt credentials');
        }

        const onTokenRefreshed = async (newAccessToken: string, newExpiry: Date) => {
          console.log(`[PUBLISHING_AGENT] Token refreshed for account ${socialAccount.id}`);
          await db.socialAccount.update({
            where: { id: socialAccount.id },
            data: {
              accessToken: encrypt(newAccessToken),
              tokenExpiry: newExpiry,
            },
          });
        };

        const publisher = getPublisher(
          socialAccount.platform,
          accessToken,
          refreshToken,
          socialAccount.tokenExpiry,
          onTokenRefreshed
        );

        // Simulated or real publishing
        const isYouTube = socialAccount.platform === 'youtube';
        const isMockMode = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || process.env.MOCK_PUBLISH === 'true';

        // Prepare publish payload metadata
        const publishPayload = {
          title: video.title || 'AI Generated Publication',
          description: video.project?.scriptText || 'Created with SCRIPT-AI',
          tags: ['AI', 'Video'],
          visibility: 'public' as const,
          caption: video.title,
          tweetText: video.title,
        };

        // Create published video log record
        const publishedVideo = await db.publishedVideo.create({
          data: {
            userId: video.userId,
            projectId: video.projectId,
            socialAccountId: socialAccount.id,
            platform: socialAccount.platform,
            title: video.title,
            status: 'Publishing via Agent...',
          },
        });

        // Publish video
        const publishResult = await publisher.publish(
          video.r2Key,
          publishPayload
        );

        // Update PublishedVideo log & ScheduledPost to Success
        await db.publishedVideo.update({
          where: { id: publishedVideo.id },
          data: {
            status: 'Published',
            externalVideoId: publishResult.externalVideoId,
            videoUrl: publishResult.videoUrl,
            publishedAt: new Date(),
          },
        });

        // Update ScheduledPost status
        await db.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        // Add user notification
        await db.notification.create({
          data: {
            userId: video.userId,
            title: 'Post Published Successfully',
            message: `Your video "${video.title}" has been successfully published to ${socialAccount.platform.toUpperCase()} (${socialAccount.channelName || socialAccount.email}).`,
            type: 'POST_PUBLISHED',
          },
        });

        results.push({ id: post.id, status: 'PUBLISHED' });
      } catch (err: any) {
        console.error(`[PUBLISHING_AGENT] Failed for post ${post.id}:`, err);
        const errMsg = err instanceof Error ? err.message : String(err);

        await db.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: 'FAILED',
            errorMessage: errMsg,
          },
        });

        // Add user notification
        await db.notification.create({
          data: {
            userId: video.userId,
            title: 'Post Publishing Failed',
            message: `Failed to publish your video "${video.title}" to ${socialAccount.platform.toUpperCase()}. Error: ${errMsg}`,
            type: 'POST_FAILED',
          },
        });

        results.push({ id: post.id, status: 'FAILED', error: errMsg });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: pendingPosts.length,
      results,
    });
  } catch (error) {
    console.error('[PUBLISHING_AGENT_ERR]:', error);
    return NextResponse.json({ error: 'Failed running publishing agent loop' }, { status: 500 });
  }
}
