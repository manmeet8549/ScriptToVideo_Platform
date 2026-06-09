import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

// Well-known ElevenLabs voice IDs for quick selection
// Users can also pass a custom voiceId from their own ElevenLabs library
const ELEVENLABS_VOICES = {
  'rachel':   '21m00Tcm4TlvDq8ikWAM', // Calm, professional female
  'drew':     '29vD33N1CtxCmqQRPOHJ', // Well-rounded male
  'clyde':    '2EiwWnXFnvU5JabPnv8n', // War veteran male (deep)
  'paul':     '5Q0t7uMcjvnagumLfvZi', // Narration male
  'domi':     'AZnzlk1XvdvUeBnXmlld', // Strong, confident female
  'dave':     'CYw3kZ02Hs0563khs1Fj', // British male
  'fin':      'D38z5RcWu1voky8WS1ja', // Irish male
  'bella':    'EXAVITQu4vr4xnSDxMaL', // Soft female
  'Antoni':   'ErXwobaYiN019PkySvjV', // Well-rounded male
  'thomas':   'GBv7mTt0atIp3Br8iCZE', // Calm, confident male
  'charlie':  'IKne3meq5aSn9XLyUdCD', // Casual Australian male
  'george':   'JBFqnCBsd6RMkjVDRZzb', // Warm British male
  'emily':    'LcfcDJNUP1GQjkzn1xUU', // Calm, pleasant female
  'elli':     'MF3mGyEYCl7XYWbV9V6O', // Emotional young female
  'callum':   'N2lVS1w4EtoT3dr4eOWO', // Masculine, intense
  'patrick':  'ODq5zmih8GrVes37Dy39', // Confident, natural male
  'harry':    'SOYHLrjzK2X1ezoPC6cr', // Anxious, young male
  'liam':     'TX3LPaxmHKxFdv7VOQHJ', // Neutral American male
  'dorothy':  'ThT5KcBeYPX3keUQqHPh', // Pleasant British female
  'josh':     'TxGEqnHWrfWFTfGW9XjX', // Deep, warm male
  'arnold':   'VR6AewLTigWG4xSOukaG', // Crisp, confident male
  'adam':     'pNInz6obpgDQGcFmaJgB', // Deep, American male
  'sam':      'yoZ06aMxZJJ28mfd3POQ', // Raspy, bold male
} as const;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId, voiceId } = await request.json();

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

    // 2. Retrieve ElevenLabs key
    const providerKey = await db.providerKey.findUnique({
      where: { userId_provider: { userId: session.user.id, provider: 'ELEVENLABS' } },
    });

    if (!providerKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Please add it in API Keys settings.' },
        { status: 400 }
      );
    }

    let elevenKey: string;
    try {
      elevenKey = decrypt(providerKey.value);
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt ElevenLabs API key' }, { status: 500 });
    }

    // 3. Resolve voice ID — use provided ID, or fallback to Rachel (calm professional)
    const resolvedVoiceId = voiceId || ELEVENLABS_VOICES['rachel'];

    // 4. Mark project as VOICING
    await db.project.update({
      where: { id: projectId },
      data: { status: 'VOICING' },
    });

    const historyEntry = await db.generationHistory.create({
      data: {
        type: 'VOICE',
        status: 'IN_PROGRESS',
        metadata: { voiceId: resolvedVoiceId },
        projectId,
        userId: session.user.id,
      },
    });

    // 5. Call ElevenLabs TTS
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: project.scriptText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.json().catch(() => ({}));
      const errorMsg =
        errorBody?.detail?.message ||
        errorBody?.detail?.status ||
        `ElevenLabs returned ${ttsResponse.status}`;

      await db.generationHistory.update({
        where: { id: historyEntry.id },
        data: { status: 'FAILED', metadata: { error: errorMsg, voiceId: resolvedVoiceId } },
      });
      await db.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });

      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    // 6. Convert audio buffer → base64 data URL
    const audioBuffer = await ttsResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // Estimate duration: average speaking rate ~150 words/min
    const wordCount = project.scriptText.trim().split(/\s+/).length;
    const estimatedSeconds = Math.ceil((wordCount / 150) * 60);
    const duration = `${Math.floor(estimatedSeconds / 60)}:${String(estimatedSeconds % 60).padStart(2, '0')}`;

    // 7. Save Voice record + advance project state
    const [voice] = await db.$transaction([
      db.voice.create({
        data: {
          accent: resolvedVoiceId,
          audioUrl: audioDataUrl,
          duration,
          projectId,
        },
      }),
      db.project.update({
        where: { id: projectId },
        data: {
          voiceAccent: resolvedVoiceId,
          duration,
          step: 'VOICE',
          status: 'DRAFT',
        },
      }),
      db.generationHistory.update({
        where: { id: historyEntry.id },
        data: {
          status: 'COMPLETED',
          metadata: {
            voiceId: resolvedVoiceId,
            duration,
            audioSizeBytes: audioBuffer.byteLength,
          },
        },
      }),
    ]);

    return NextResponse.json({
      audioUrl: audioDataUrl,
      voiceId: voice.accent,
      duration,
    });
  } catch (error) {
    console.error('[GENERATE/VOICE] Error:', error);
    return NextResponse.json({ error: 'Voice generation failed' }, { status: 500 });
  }
}
