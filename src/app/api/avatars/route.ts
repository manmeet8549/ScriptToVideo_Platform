import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender: string;
  preview_image_url: string;
  preview_video_url: string | null;
}

// GET /api/avatars — Proxy HeyGen avatar list using the user's stored key
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Retrieve stored HeyGen key
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

  try {
    const res = await fetch('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': heygenKey },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorBody?.message || `HeyGen returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    // HeyGen v2 wraps in data.avatars
    const rawAvatars: Record<string, unknown>[] = data?.data?.avatars ?? data?.avatars ?? [];

    const avatars: HeyGenAvatar[] = rawAvatars.map((a) => ({
      avatar_id: a.avatar_id as string,
      avatar_name: (a.avatar_name ?? a.name ?? 'Unknown') as string,
      gender: (a.gender ?? '') as string,
      preview_image_url: (a.preview_image_url ?? a.image_url ?? '') as string,
      preview_video_url: (a.preview_video_url ?? null) as string | null,
    }));

    return NextResponse.json({ avatars });
  } catch (error) {
    console.error('[AVATARS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch avatars' }, { status: 500 });
  }
}
