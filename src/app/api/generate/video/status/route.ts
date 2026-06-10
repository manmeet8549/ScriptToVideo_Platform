import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { uploadToR2, generateSignedUrl } from '@/lib/r2';

export const maxDuration = 60; // Allow up to 60 seconds on Vercel (Hobby plan limit)

// GET /api/generate/video/status?projectId=xxx
// Polls HeyGen for video status and updates the project when complete.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId query param is required' }, { status: 400 });
  }

  // 1. Load project
  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // 2. Extract the HeyGen video ID from the stored videoUrl (format: "heygen:<videoId>")
  if (!project.videoUrl?.startsWith('heygen:')) {
    // Already completed or not started
    if (project.status === 'COMPLETED' && project.videoUrl) {
      return NextResponse.json({ status: 'completed', videoUrl: project.videoUrl });
    }
    return NextResponse.json(
      { error: 'No pending HeyGen video job found for this project' },
      { status: 400 }
    );
  }

  const heygenVideoId = project.videoUrl.replace('heygen:', '');

  // 3. Retrieve HeyGen key
  const providerKey = await db.providerKey.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: 'HEYGEN' } },
  });

  if (!providerKey) {
    return NextResponse.json({ error: 'HeyGen API key not configured' }, { status: 400 });
  }

  let heygenKey: string;
  try {
    heygenKey = decrypt(providerKey.value);
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt HeyGen API key' }, { status: 500 });
  }

  // 4. Poll HeyGen status endpoint
  const statusResponse = await fetch(
    `https://api.heygen.com/v1/video_status.get?video_id=${heygenVideoId}`,
    {
      headers: { 'X-Api-Key': heygenKey },
    }
  );

  if (!statusResponse.ok) {
    const errorBody = await statusResponse.json().catch(() => ({}));
    return NextResponse.json(
      { error: errorBody?.message || `HeyGen status check failed: ${statusResponse.status}` },
      { status: 502 }
    );
  }

  const statusData = await statusResponse.json();
  // HeyGen status field: "pending" | "processing" | "completed" | "failed"
  const heygenStatus: string = statusData?.data?.status ?? statusData?.status ?? 'processing';
  const videoUrl: string = statusData?.data?.video_url ?? statusData?.video_url ?? '';

  if (heygenStatus === 'completed' && videoUrl) {
    try {
      console.log(`[STATUS_POLLER] Video completed on HeyGen. Downloading from URL: ${videoUrl}`);
      
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video from HeyGen: Status ${videoResponse.status}`);
      }

      const arrayBuffer = await videoResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileSize = buffer.byteLength;

      // Extract duration from HeyGen response metadata if available
      let duration: number | null = null;
      const heygenDuration = statusData?.data?.duration ?? statusData?.duration;
      if (typeof heygenDuration === 'number') {
        duration = heygenDuration;
      } else if (typeof heygenDuration === 'string') {
        duration = parseFloat(heygenDuration) || null;
      }

      const r2Key = `videos/${session.user.id}/${projectId}.mp4`;
      console.log(`[STATUS_POLLER] Video completed on HeyGen. Uploading binary to Cloudflare R2. Key: "${r2Key}", Size: ${fileSize} bytes`);
      await uploadToR2(r2Key, buffer, 'video/mp4');
      console.log(`[STATUS_POLLER] Cloudflare R2 Upload SUCCESS for key: "${r2Key}"`);

      // Generate a signed URL for immediate use
      const signedUrl = await generateSignedUrl(r2Key, 3600);
      console.log(`[STATUS_POLLER] Generated dynamic R2 signed URL: "${signedUrl}"`);
      const videoTitle = project.name || 'Generated Avatar Video';

      console.log(`[STATUS_POLLER] Registering video in database and updating project state. Title: "${videoTitle}"`);

      // 5a. Save Video record, update project, update generation history
      await db.$transaction([
        db.video.create({
          data: {
            userId: session.user.id,
            projectId: projectId,
            title: videoTitle,
            status: 'COMPLETED',
            r2Key,
            videoUrl: signedUrl,
            fileSize,
            duration,
          },
        }),
        db.project.update({
          where: { id: projectId },
          data: {
            videoUrl: signedUrl,
            step: 'VIDEO',
            status: 'COMPLETED',
          },
        }),
        // Update the latest VIDEO history entry
        db.generationHistory.updateMany({
          where: {
            projectId,
            type: 'VIDEO',
            status: 'IN_PROGRESS',
          },
          data: {
            status: 'COMPLETED',
            metadata: { 
              heygenVideoId, 
              heygenVideoUrl: videoUrl,
              r2Key,
              fileSize,
              duration
            },
          },
        }),
      ]);

      return NextResponse.json({ status: 'completed', videoUrl: signedUrl });
    } catch (uploadError) {
      console.error('[STATUS_POLLER] Failed to process/upload completed HeyGen video to R2. Attempting database fallback to HeyGen URL...', uploadError);
      
      try {
        await db.project.update({
          where: { id: projectId },
          data: {
            videoUrl: videoUrl,
            step: 'VIDEO',
            status: 'COMPLETED',
          },
        });
        
        await db.generationHistory.updateMany({
          where: {
            projectId,
            type: 'VIDEO',
            status: 'IN_PROGRESS',
          },
          data: {
            status: 'COMPLETED',
            metadata: { 
              heygenVideoId, 
              heygenVideoUrl: videoUrl,
              error: uploadError instanceof Error ? uploadError.message : String(uploadError),
              r2UploadFailed: true,
            },
          },
        });
      } catch (dbError) {
        console.error('[STATUS_POLLER] Failed to write database fallback:', dbError);
      }

      // Fallback: If R2 upload fails, log it but don't crash, return the raw HeyGen URL as temporary fallback
      // so the user can still access it while we log the failure.
      return NextResponse.json({ 
        status: 'completed', 
        videoUrl, 
        warning: 'R2 storage upload failed. Using provider URL fallback.' 
      });
    }
  }

  if (heygenStatus === 'failed') {
    const failureReason = statusData?.data?.error ?? statusData?.error ?? 'Unknown reason';

    await db.$transaction([
      db.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      }),
      db.generationHistory.updateMany({
        where: {
          projectId,
          type: 'VIDEO',
          status: 'IN_PROGRESS',
        },
        data: {
          status: 'FAILED',
          metadata: { heygenVideoId, error: failureReason },
        },
      }),
    ]);

    return NextResponse.json({ status: 'failed', error: failureReason });
  }

  // Still processing
  return NextResponse.json({ status: heygenStatus, videoId: heygenVideoId });
}
