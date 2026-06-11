import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const publishedVideos = await db.publishedVideo.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        projectId: true,
        platform: true,
        socialAccountId: true,
        title: true,
        status: true,
        externalVideoId: true,
        videoUrl: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ publishedVideos });
  } catch (error) {
    console.error('[PUBLISH_VIDEOS] Error fetching published history:', error);
    return NextResponse.json({ error: 'Failed to retrieve published videos' }, { status: 500 });
  }
}
