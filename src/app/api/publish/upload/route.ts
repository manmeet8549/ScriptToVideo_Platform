import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt, encrypt } from '@/lib/encryption';
import { getPublisher } from '@/lib/publishers';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { videoId, targets } = await request.json();

    if (!videoId || !targets || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: 'videoId and targets (array) are required' }, { status: 400 });
    }

    // 1. Verify video ownership
    const video = await db.video.findFirst({
      where: { id: videoId, userId },
      include: { project: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found or access denied.' }, { status: 404 });
    }

    // 1.5 Fetch and validate accounts and verify environment variables for YouTube
    const accountIds = targets.map((t: { socialAccountId: string }) => t.socialAccountId);
    const targetAccounts = await db.socialAccount.findMany({
      where: {
        id: { in: accountIds },
        userId,
      },
    });

    const hasYouTubeTarget = targetAccounts.some((a) => a.platform === 'youtube');
    if (hasYouTubeTarget) {
      const requiredVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'NEXTAUTH_URL',
        'NEXTAUTH_SECRET',
      ];
      for (const v of requiredVars) {
        if (!process.env[v]) {
          const errMsg = `❌ Google API credentials not configured. Missing environment variable: ${v}`;
          console.error(`[YOUTUBE_UPLOAD_FAILED] Missing environment variable: ${v}`);
          return NextResponse.json({ error: errMsg }, { status: 400 });
        }
      }
    }

    const initiatedUploads = [];

    // 2. Loop through all targets, validate accounts, and create PublishedVideo records
    for (const target of targets) {
      const { socialAccountId, title, description, tags, visibility, caption, tweetText } = target;

      const account = targetAccounts.find((a) => a.id === socialAccountId);

      if (!account) {
        return NextResponse.json({ error: `Social account ${socialAccountId} not found or unauthorized` }, { status: 400 });
      }

      // Create PublishedVideo record with "Preparing video..." status
      const publishedVideo = await db.publishedVideo.create({
        data: {
          userId,
          projectId: video.projectId,
          socialAccountId: account.id,
          platform: account.platform,
          title: title || caption || tweetText || 'Untitled Publication',
          status: 'Preparing video...',
        },
      });

      initiatedUploads.push({
        publishedVideoId: publishedVideo.id,
        platform: account.platform,
        channelName: account.channelName,
      });

      // Fire off background worker for this target
      const runBackgroundUpload = async () => {
        const isYouTube = account.platform === 'youtube';
        try {
          if (isYouTube) {
            console.log(`[YOUTUBE_UPLOAD_START] Starting upload for user: ${userId}, channelId: ${account.id}, videoId: ${video.id}`);
          }

          // Decrypt tokens
          let accessToken = '';
          let refreshToken: string | null = null;
          try {
            accessToken = decrypt(account.accessToken);
            refreshToken = account.refreshToken ? decrypt(account.refreshToken) : null;
          } catch {
            throw new Error('Failed to decrypt access credentials.');
          }

          const onTokenRefreshed = async (newAccessToken: string, newExpiry: Date) => {
            console.log(`[BACKGROUND_UPLOAD] Token refreshed for ${account.platform}, saving...`);
            await db.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken: encrypt(newAccessToken),
                tokenExpiry: newExpiry,
              },
            });
          };

          const publisher = getPublisher(
            account.platform,
            accessToken,
            refreshToken,
            account.tokenExpiry,
            onTokenRefreshed
          );

          const onProgress = async (bytesUploaded: number, totalBytes: number) => {
            const percent = Math.round((bytesUploaded / totalBytes) * 100);
            if (isYouTube) {
              console.log(`[YOUTUBE_UPLOAD_PROGRESS] Progress: ${percent}% (${bytesUploaded}/${totalBytes} bytes) for video ${video.id}`);
            }
            await db.publishedVideo.update({
              where: { id: publishedVideo.id },
              data: { status: `Uploading: ${percent}%` },
            });
          };

          const result = await publisher.publish(
            video.r2Key,
            {
              title,
              description,
              tags,
              visibility,
              caption,
              tweetText,
            },
            onProgress
          );

          const processingStatus = isYouTube ? 'Processing on YouTube...' : 'Processing...';

          // Mark as Processing
          await db.publishedVideo.update({
            where: { id: publishedVideo.id },
            data: {
              status: processingStatus,
              externalVideoId: result.externalVideoId,
              videoUrl: result.videoUrl,
            },
          });

          // Wait for processing
          const isMockMode = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || process.env.MOCK_PUBLISH === 'true' || !isYouTube;

          if (isMockMode) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            await db.publishedVideo.update({
              where: { id: publishedVideo.id },
              data: {
                status: 'Published',
                publishedAt: new Date(),
              },
            });
          } else {
            // Real YouTube processing checks...
            let checks = 0;
            let isProcessed = false;
            while (checks < 6 && !isProcessed) {
              await new Promise((resolve) => setTimeout(resolve, 10000));
              checks++;
              try {
                const checkRes = await fetch(
                  `https://www.googleapis.com/youtube/v3/videos?part=status&id=${result.externalVideoId}`,
                  { headers: { 'Authorization': `Bearer ${accessToken}` } }
                );
                if (checkRes.ok) {
                  const checkData = await checkRes.json();
                  const ytStatus = checkData.items?.[0]?.status;
                  if (ytStatus?.uploadStatus === 'processed' || ytStatus?.uploadStatus === 'uploaded') {
                    isProcessed = true;
                  }
                }
              } catch (e) {
                console.error('Error checking YouTube status:', e);
              }
            }

            await db.publishedVideo.update({
              where: { id: publishedVideo.id },
              data: {
                status: 'Published',
                publishedAt: new Date(),
              },
            });
          }

          if (isYouTube) {
            console.log(`[YOUTUBE_UPLOAD_SUCCESS] Uploaded successfully! Video ID: ${result.externalVideoId}, URL: ${result.videoUrl}`);
          }
        } catch (err) {
          console.error(`[BACKGROUND_UPLOAD] Failed for published video ${publishedVideo.id}:`, err);
          if (isYouTube) {
            console.error(`[YOUTUBE_UPLOAD_FAILED] YouTube upload failed. userId: ${userId}, channelId: ${account.id}, videoId: ${video.id}, error message: ${err instanceof Error ? err.message : String(err)}`);
          }
          await db.publishedVideo.update({
            where: { id: publishedVideo.id },
            data: {
              status: `Failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          });
        }
      };

      runBackgroundUpload();
    }

    return NextResponse.json({
      success: true,
      uploads: initiatedUploads,
    });
  } catch (error) {
    console.error('[PUBLISH_UPLOAD] Error:', error);
    return NextResponse.json({ error: 'Failed to initiate video upload targets' }, { status: 500 });
  }
}
