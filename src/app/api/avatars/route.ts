import { NextRequest, NextResponse } from 'next/server';
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

// GET /api/avatars — Proxy HeyGen avatar list or get details for a specific ID
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if a specific ID is requested for verification
  const { searchParams } = request.nextUrl;
  const avatarId = searchParams.get('id');

  // Retrieve stored HeyGen key (check organization first, then user)
  let providerKey = null;
  if (session.user.organizationId) {
    providerKey = await db.providerKey.findUnique({
      where: {
        organizationId_provider: {
          organizationId: session.user.organizationId,
          provider: 'HEYGEN',
        },
      },
    });
  }
  if (!providerKey) {
    providerKey = await db.providerKey.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: 'HEYGEN',
        },
      },
    });
  }

  if (!providerKey) {
    return NextResponse.json(
      { error: 'HeyGen API key not configured. Please add it in API Keys or Org settings.' },
      { status: 400 }
    );
  }

  let heygenKey: string;
  try {
    heygenKey = decrypt(providerKey.value);
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt HeyGen API key' }, { status: 500 });
  }

  if (avatarId) {
    try {
      // 1. Try to fetch as a v3 Look ID
      const lookRes = await fetch(`https://api.heygen.com/v3/avatars/looks/${avatarId}`, {
        headers: { 'X-Api-Key': heygenKey },
      });

      if (lookRes.ok) {
        const lookData = await lookRes.json();
        const look = lookData?.data;
        if (look) {
          const avatar: HeyGenAvatar = {
            avatar_id: look.id,
            avatar_name: look.name || 'Unknown',
            gender: look.gender || '',
            preview_image_url: look.preview_image_url || '',
            preview_video_url: look.preview_video_url || null,
          };
          return NextResponse.json({ avatar });
        }
      }

      // 2. Try to fetch as a v3 Avatar Group
      const groupRes = await fetch(`https://api.heygen.com/v3/avatars/${avatarId}`, {
        headers: { 'X-Api-Key': heygenKey },
      });

      if (groupRes.ok) {
        const groupData = await groupRes.json();
        const group = groupData?.data;
        if (group) {
          const avatar: HeyGenAvatar = {
            avatar_id: group.id,
            avatar_name: group.name || 'Unknown',
            gender: group.gender || '',
            preview_image_url: group.preview_image_url || '',
            preview_video_url: group.preview_video_url || null,
          };
          return NextResponse.json({ avatar });
        }
      }

      // 3. Fallback: List all v2 avatars and search for the ID
      const listRes = await fetch('https://api.heygen.com/v2/avatars', {
        headers: { 'X-Api-Key': heygenKey },
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const rawAvatars: Record<string, unknown>[] = listData?.data?.avatars ?? listData?.avatars ?? [];
        const found = rawAvatars.find((a) => a.avatar_id === avatarId);
        if (found) {
          const avatar: HeyGenAvatar = {
            avatar_id: found.avatar_id as string,
            avatar_name: (found.avatar_name ?? found.name ?? 'Unknown') as string,
            gender: (found.gender ?? '') as string,
            preview_image_url: (found.preview_image_url ?? found.image_url ?? '') as string,
            preview_video_url: (found.preview_video_url ?? null) as string | null,
          };
          return NextResponse.json({ avatar });
        }
      }

      // If all checks fail, return a 404 error
      return NextResponse.json(
        { error: `Avatar with ID "${avatarId}" not found or unauthorized` },
        { status: 404 }
      );
    } catch (error) {
      console.error('[AVATARS VERIFY] Error:', error);
      return NextResponse.json({ error: 'Failed to verify avatar ID' }, { status: 500 });
    }
  }

  // Default: list all avatars
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
