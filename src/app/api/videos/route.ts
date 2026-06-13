import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generateSignedUrl } from '@/lib/r2';
import { backfillUserVideos } from '@/lib/backfill';

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
  thumbnailUrl?: string | null;
  thumbnailKey?: string | null;
  createdAt: Date;
  project: {
    name: string;
    videoRatio: 'RATIO_16_9' | 'RATIO_9_16' | 'RATIO_1_1' | null;
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run the backfill audit pipeline to ensure all videos are in R2 and PostgreSQL (skip for editors)
    if (session.user.role !== 'EDITOR') {
      await backfillUserVideos(session.user.id);
    }

    const whereClause: any = {};
    const isUserAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role || '');
    if (isUserAdmin) {
      // Admin sees everything
    } else if (session.user.role === 'EDITOR') {
      // Editor sees only videos for which they have assignments
      whereClause.assignments = {
        some: {
          editorId: session.user.id,
        },
      };
    } else {
      // User sees only their own videos
      whereClause.userId = session.user.id;
    }

    // Fetch all completed videos for the organization/user
    const videos = await db.video.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            name: true,
            videoRatio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate fresh signed R2 URLs for each video and its thumbnail
    const videosWithUrls = await Promise.all(
      (videos as unknown as VideoItem[]).map(async (v: VideoItem) => {
        try {
          const signedUrl = await generateSignedUrl(v.r2Key, 3600);
          let thumbnailUrl = v.thumbnailUrl;
          if (v.thumbnailKey) {
            try {
              thumbnailUrl = await generateSignedUrl(v.thumbnailKey, 3600);
            } catch (thumbErr) {
              console.error(`[VIDEOS_API] Failed to sign thumbnail URL for key ${v.thumbnailKey}:`, thumbErr);
            }
          }
          return {
            ...v,
            videoUrl: signedUrl,
            thumbnailUrl,
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
