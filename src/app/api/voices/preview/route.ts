import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { voiceId, text, settings } = await request.json();

    if (!voiceId) {
      return NextResponse.json({ error: 'voiceId is required' }, { status: 400 });
    }

    // Default short preview text
    const previewText = text || 'This is a preview of your custom voice settings.';

    // Retrieve ElevenLabs key (check organization first, then user)
    let providerKey = null;
    if (session.user.organizationId) {
      providerKey = await db.providerKey.findUnique({
        where: {
          organizationId_provider: {
            organizationId: session.user.organizationId,
            provider: 'ELEVENLABS',
          },
        },
      });
    }
    if (!providerKey) {
      providerKey = await db.providerKey.findUnique({
        where: {
          userId_provider: {
            userId: session.user.id,
            provider: 'ELEVENLABS',
          },
        },
      });
    }

    if (!providerKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Please add it in API Keys or Org settings.' },
        { status: 400 }
      );
    }

    let elevenKey: string;
    try {
      elevenKey = decrypt(providerKey.value);
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt ElevenLabs API key' }, { status: 500 });
    }

    const ttsSettings = {
      stability: typeof settings?.stability === 'number' ? settings.stability : 0.5,
      similarity_boost: typeof settings?.similarity_boost === 'number' ? settings.similarity_boost : 0.75,
      style: typeof settings?.style === 'number' ? settings.style : 0.0,
      use_speaker_boost: typeof settings?.use_speaker_boost === 'boolean' ? settings.use_speaker_boost : true,
    };

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: previewText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: ttsSettings,
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.json().catch(() => ({}));
      const rawErrorMsg = errorBody?.detail?.message || errorBody?.detail?.status || `ElevenLabs returned HTTP ${ttsResponse.status}`;
      return NextResponse.json({ error: `ElevenLabs TTS failed: ${rawErrorMsg}` }, { status: 502 });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return NextResponse.json({ audioUrl: audioDataUrl });
  } catch (error) {
    console.error('[VOICE_PREVIEW] Error:', error);
    return NextResponse.json({ error: 'Voice preview failed' }, { status: 500 });
  }
}
