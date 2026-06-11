import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing publishedVideoId parameter' }, { status: 400 });
  }

  try {
    const publishedVideo = await db.publishedVideo.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        platform: true,
        status: true,
        externalVideoId: true,
        videoUrl: true,
        title: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    if (!publishedVideo) {
      return NextResponse.json({ error: 'Published video record not found' }, { status: 404 });
    }

    return NextResponse.json({ publishedVideo });
  } catch (error) {
    console.error('[PUBLISH_STATUS] Error fetching upload status:', error);
    return NextResponse.json({ error: 'Failed to retrieve published video status' }, { status: 500 });
  }
}
