import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url: string | null;
  labels: Record<string, string>;
}

// GET /api/voices — Proxy ElevenLabs voice list using the user's stored key
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Retrieve stored ElevenLabs key (check organization first, then user)
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

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': elevenKey },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorBody?.detail?.status || `ElevenLabs returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const voices: ElevenLabsVoice[] = (data.voices ?? []).map(
      (v: Record<string, unknown>) => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category ?? 'premade',
        preview_url: v.preview_url ?? null,
        labels: (v.labels as Record<string, string>) ?? {},
      })
    );

    return NextResponse.json({ voices });
  } catch (error) {
    console.error('[VOICES] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
}
