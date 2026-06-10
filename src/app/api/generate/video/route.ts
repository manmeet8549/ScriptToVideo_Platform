import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export const maxDuration = 60; // Allow up to 60 seconds on Vercel (Hobby plan limit)

// Map our VideoRatio enum to HeyGen pixel dimensions
const RATIO_TO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  RATIO_16_9: { width: 1280, height: 720 },
  RATIO_9_16: { width: 720, height: 1280 },
  RATIO_1_1:  { width: 1080, height: 1080 },
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId, avatarId, heygenVoiceId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // 1. Load project
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.scriptText?.trim()) {
      return NextResponse.json(
        { error: 'Project has no script. Generate a script first.' },
        { status: 400 }
      );
    }

    // 2. Retrieve HeyGen key
    const providerKey = await db.providerKey.findUnique({
      where: { userId_provider: { userId: session.user.id, provider: 'HEYGEN' } },
    });

    if (!providerKey) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured. Please add it in API Keys settings.' },
        { status: 400 }
      );
    }

    let heygenKey: string;
    try {
      heygenKey = decrypt(providerKey.value);
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt HeyGen API key' }, { status: 500 });
    }

    // 3. Resolve dimensions
    const dimensions =
      RATIO_TO_DIMENSIONS[project.videoRatio ?? 'RATIO_16_9'] ?? RATIO_TO_DIMENSIONS['RATIO_16_9'];

    // 4. Build HeyGen payload
    let voicePayload;
    if (heygenVoiceId) {
      // If user explicitly provided a HeyGen voice ID, use it
      voicePayload = {
        type: 'text',
        input_text: project.scriptText,
        voice_id: heygenVoiceId,
      };
    } else {
      // Look for the latest voice generated for the project in Step 3
      const latestVoice = await db.voice.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
      });

      if (latestVoice && latestVoice.audioUrl) {
        const host = request.headers.get('host') || 'script-to-video-platform.vercel.app';
        const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
        const baseUrl = `${proto}://${host}`;

        voicePayload = {
          type: 'audio',
          audio_url: `${baseUrl}/api/audio/${latestVoice.id}`,
        };
      } else {
        // Fallback to default HeyGen built-in friendly male voice
        voicePayload = {
          type: 'text',
          input_text: project.scriptText,
          voice_id: '2d5b0e6cf36f460aa7fc47e3eee4ba54',
        };
      }
    }

    const heygenPayload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: avatarId ?? 'AngelicaHansen-incasualsuit-20220916', // default stock avatar
            avatar_style: 'normal',
          },
          voice: voicePayload,
          background: {
            type: 'color',
            value: '#0a0a0a',
          },
        },
      ],
      dimension: dimensions,
      test: false, // set true for free watermarked renders during development
    };

    // 5. Mark project as GENERATING
    await db.project.update({
      where: { id: projectId },
      data: { status: 'GENERATING' },
    });

    const historyEntry = await db.generationHistory.create({
      data: {
        type: 'VIDEO',
        status: 'IN_PROGRESS',
        metadata: { avatarId, heygenVoiceId, dimensions },
        projectId,
        userId: session.user.id,
      },
    });

    // 6. Submit video job to HeyGen
    const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(heygenPayload),
    });

    if (!heygenResponse.ok) {
      const errorBody = await heygenResponse.json().catch(() => ({}));
      const errorMsg =
        errorBody?.message ||
        (typeof errorBody?.error === 'object' && errorBody?.error !== null ? errorBody?.error?.message : errorBody?.error) ||
        `HeyGen returned ${heygenResponse.status}`;

      await db.generationHistory.update({
        where: { id: historyEntry.id },
        data: { status: 'FAILED', metadata: { error: errorMsg } },
      });
      await db.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });

      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    const heygenData = await heygenResponse.json();
    const videoId: string = heygenData?.data?.video_id ?? heygenData?.video_id ?? '';

    if (!videoId) {
      return NextResponse.json(
        { error: 'HeyGen did not return a video ID' },
        { status: 502 }
      );
    }

    // 7. Save videoId to history metadata for polling
    await db.generationHistory.update({
      where: { id: historyEntry.id },
      data: {
        metadata: {
          avatarId,
          heygenVoiceId,
          dimensions,
          heygenVideoId: videoId,
          historyEntryId: historyEntry.id,
        },
      },
    });

    // Also stash the videoId in the project's videoUrl field temporarily (prefixed)
    // so the status route can find it without extra DB queries
    await db.project.update({
      where: { id: projectId },
      data: { videoUrl: `heygen:${videoId}` },
    });

    return NextResponse.json({
      videoId,
      status: 'processing',
      message: 'Video generation started. Poll /api/generate/video/status for updates.',
    });
  } catch (error) {
    console.error('[GENERATE/VIDEO] Error:', error);
    return NextResponse.json({ error: 'Video generation failed' }, { status: 500 });
  }
}
