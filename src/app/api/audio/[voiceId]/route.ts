import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest, props: { params: Promise<{ voiceId: string }> }) {
  try {
    const { voiceId } = await props.params;

    if (!voiceId) {
      return new NextResponse('Voice ID is required', { status: 400 });
    }

    // Fetch the voice from database
    const voice = await db.voice.findUnique({
      where: { id: voiceId },
    });

    if (!voice || !voice.audioUrl) {
      return new NextResponse('Audio not found', { status: 404 });
    }

    // voice.audioUrl is a data URL like: data:audio/mpeg;base64,SUQz...
    const match = voice.audioUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return new NextResponse('Invalid audio format in database', { status: 500 });
    }

    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[AUDIO_SERVE] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
