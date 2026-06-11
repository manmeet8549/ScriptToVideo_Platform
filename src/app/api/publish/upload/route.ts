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
    const { videoId, title, description, tags, visibility, publishAt } = await request.json();

    if (!videoId || !title || !description) {
      return NextResponse.json({ error: 'videoId, title, and description are required' }, { status: 400 });
    }

    // 1. Verify video ownership
    const video = await db.video.findFirst({
      where: { id: videoId, userId },
      include: { project: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found or access denied.' }, { status: 404 });
    }

    // 2. Fetch connected social account
    const account = await db.socialAccount.findUnique({
      where: { userId_platform: { userId, platform: 'youtube' } },
    });

    if (!account) {
      return NextResponse.json({ error: 'YouTube account is not connected.' }, { status: 400 });
    }

    // 3. Decrypt tokens
    let accessToken: string;
    let refreshToken: string | null = null;
    try {
      accessToken = decrypt(account.accessToken);
      refreshToken = account.refreshToken ? decrypt(account.refreshToken) : null;
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt access tokens.' }, { status: 500 });
    }

    // 4. Create PublishedVideo record with PENDING/PREPARING status
    const publishedVideo = await db.publishedVideo.create({
      data: {
        userId,
        projectId: video.projectId,
        platform: 'youtube',
        title,
        status: 'Preparing Upload',
      },
    });

    // 5. Fire off asynchronous upload task (Non-blocking)
    const runBackgroundUpload = async () => {
      try {
        console.log(`[BACKGROUND_UPLOAD] Starting background upload for PublishedVideo ${publishedVideo.id}`);

        // Callback to save new access tokens if they are refreshed during upload
        const onTokenRefreshed = async (newAccessToken: string, newExpiry: Date) => {
          console.log('[BACKGROUND_UPLOAD] Token refreshed, saving encrypted credentials back to database.');
          await db.socialAccount.update({
            where: { userId_platform: { userId, platform: 'youtube' } },
            data: {
              accessToken: encrypt(newAccessToken),
              tokenExpiry: newExpiry,
            },
          });
        };

        const publisher = getPublisher(
          'youtube',
          accessToken,
          refreshToken,
          account.tokenExpiry,
          onTokenRefreshed
        );

        // Progress callback to update database status
        const onProgress = async (bytesUploaded: number, totalBytes: number) => {
          const percent = Math.round((bytesUploaded / totalBytes) * 100);
          console.log(`[BACKGROUND_UPLOAD] Progress for ${publishedVideo.id}: ${percent}%`);
          
          await db.publishedVideo.update({
            where: { id: publishedVideo.id },
            data: { status: `Uploading: ${percent}%` },
          });
        };

        // Perform the upload
        const result = await publisher.publish(
          video.r2Key,
          {
            title,
            description,
            tags,
            visibility: visibility as 'public' | 'unlisted' | 'private',
            publishAt: publishAt ? new Date(publishAt) : undefined,
          },
          onProgress
        );

        // Upload complete, mark as Processing
        await db.publishedVideo.update({
          where: { id: publishedVideo.id },
          data: {
            status: 'Processing',
            externalVideoId: result.externalVideoId,
            videoUrl: result.videoUrl,
          },
        });

        // Query YouTube Data API for processing status
        // For Mock mode, simulate transition to Published after 3 seconds
        const isMockMode = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || process.env.MOCK_PUBLISH === 'true';
        if (isMockMode) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await db.publishedVideo.update({
            where: { id: publishedVideo.id },
            data: {
              status: 'Published',
              publishedAt: new Date(),
            },
          });
          console.log(`[BACKGROUND_UPLOAD] PublishedVideo ${publishedVideo.id} marked as Published (Mock).`);
        } else {
          // Real check: Poll YouTube API processingStatus every 10s up to 6 times
          let checks = 0;
          let isProcessed = false;
          while (checks < 6 && !isProcessed) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            checks++;
            
            try {
              const checkRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=status&id=${result.externalVideoId}`,
                {
                  headers: { 'Authorization': `Bearer ${accessToken}` },
                }
              );
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                const ytStatus = checkData.items?.[0]?.status;
                if (ytStatus) {
                  console.log(`[BACKGROUND_UPLOAD] YouTube status for ${result.externalVideoId}:`, ytStatus.uploadStatus);
                  if (ytStatus.uploadStatus === 'processed' || ytStatus.uploadStatus === 'uploaded') {
                    isProcessed = true;
                  }
                }
              }
            } catch (checkErr) {
              console.error('[BACKGROUND_UPLOAD] Error checking video status:', checkErr);
            }
          }

          // Mark as fully published
          await db.publishedVideo.update({
            where: { id: publishedVideo.id },
            data: {
              status: 'Published',
              publishedAt: new Date(),
            },
          });
          console.log(`[BACKGROUND_UPLOAD] PublishedVideo ${publishedVideo.id} marked as Published (Real).`);
        }
      } catch (err) {
        console.error(`[BACKGROUND_UPLOAD] Upload failed for PublishedVideo ${publishedVideo.id}:`, err);
        await db.publishedVideo.update({
          where: { id: publishedVideo.id },
          data: {
            status: `Failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        });
      }
    };

    // Trigger async execution
    runBackgroundUpload();

    return NextResponse.json({
      success: true,
      publishedVideoId: publishedVideo.id,
      status: publishedVideo.status,
    });
  } catch (error) {
    console.error('[PUBLISH_UPLOAD] Error initiating upload:', error);
    return NextResponse.json({ error: 'Failed to initiate video upload' }, { status: 500 });
  }
}
