import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generateSignedUrl } from '@/lib/r2';

interface VideoItem {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  status: string;
  r2Key: string;
  videoUrl: string;
  fileSize: number | null;
  duration: number | null;
  createdAt: Date;
  project: {
    name: string;
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all completed videos for the user
    const videos = await db.video.findMany({
      where: { userId: session.user.id },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate fresh signed R2 URLs for each video
    const videosWithUrls = await Promise.all(
      (videos as unknown as VideoItem[]).map(async (v: VideoItem) => {
        try {
          const signedUrl = await generateSignedUrl(v.r2Key, 3600);
          return {
            ...v,
            videoUrl: signedUrl,
          };
        } catch (err) {
          console.error(`[VIDEOS_API] Failed to sign URL for key ${v.r2Key}:`, err);
          return v;
        }
      })
    );

    return NextResponse.json({ videos: videosWithUrls });
  } catch (error) {
    console.error('[VIDEOS_API] Error listing videos:', error);
    return NextResponse.json({ error: 'Failed to retrieve videos' }, { status: 500 });
  }
}
