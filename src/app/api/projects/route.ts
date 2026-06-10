import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { backfillUserVideos } from '@/lib/backfill';
import { generateSignedUrl } from '@/lib/r2';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(120),
  prompt: z.string().min(1, 'Prompt is required'),
  videoRatio: z.enum(['RATIO_16_9', 'RATIO_9_16', 'RATIO_1_1']).optional(),
});

// GET /api/projects — list all projects for authenticated user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run the backfill audit pipeline to ensure all videos are in R2 and PostgreSQL
    await backfillUserVideos(session.user.id);
  } catch (err) {
    console.error('[PROJECTS_GET] Failed to backfill videos:', err);
  }

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { scripts: true, voices: true },
      },
      videos: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  // Dynamically generate signed URLs for video and thumbnail
  for (const project of projects) {
    const latestVideo = project.videos?.[0];
    if (latestVideo) {
      try {
        const signedVideo = await generateSignedUrl(latestVideo.r2Key, 3600);
        project.videoUrl = signedVideo;
        latestVideo.videoUrl = signedVideo;
      } catch (err) {
        console.error('[PROJECTS_GET_LIST] Failed to sign video URL:', err);
      }
      if (latestVideo.thumbnailKey) {
        try {
          const signedThumbnail = await generateSignedUrl(latestVideo.thumbnailKey, 3600);
          latestVideo.thumbnailUrl = signedThumbnail;
        } catch (err) {
          console.error('[PROJECTS_GET_LIST] Failed to sign thumbnail URL:', err);
        }
      }
    }
  }

  return NextResponse.json({ projects });
}

// POST /api/projects — create a new project
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        name: parsed.data.name,
        prompt: parsed.data.prompt,
        videoRatio: parsed.data.videoRatio,
        userId: session.user.id,
      },
    });

    // Log the creation event
    await db.generationHistory.create({
      data: {
        type: 'SCRIPT',
        status: 'PENDING',
        metadata: { action: 'project_created', projectName: project.name },
        projectId: project.id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('[PROJECTS] POST Error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
