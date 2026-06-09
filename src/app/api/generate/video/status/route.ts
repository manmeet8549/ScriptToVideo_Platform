import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

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
    // 5a. Update project with real video URL and mark as COMPLETED
    await db.$transaction([
      db.project.update({
        where: { id: projectId },
        data: {
          videoUrl,
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
          metadata: { heygenVideoId, videoUrl },
        },
      }),
    ]);

    return NextResponse.json({ status: 'completed', videoUrl });
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
