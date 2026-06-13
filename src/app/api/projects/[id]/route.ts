import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { generateSignedUrl } from '@/lib/r2';
import { backfillUserVideos } from '@/lib/backfill';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  prompt: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'SCRIPTING', 'VOICING', 'GENERATING', 'COMPLETED', 'FAILED']).optional(),
  step: z.enum(['IDEA', 'SCRIPT', 'VOICE', 'VIDEO']).optional(),
  scriptText: z.string().optional(),
  voiceAccent: z.string().optional(),
  videoRatio: z.enum(['RATIO_16_9', 'RATIO_9_16', 'RATIO_1_1']).optional(),
  videoUrl: z.string().url().optional(),
  duration: z.string().optional(),
});

// GET /api/projects/:id
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;

  // Run the backfill audit pipeline asynchronously so we do not block the page load
  if (session.user.role !== 'EDITOR') {
    backfillUserVideos(session.user.id).catch((err) => {
      console.error('[PROJECT_GET_DETAIL] Failed to backfill videos:', err);
    });
  }

  const whereClause: any = { id };
  const isUserAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role || '');
  if (isUserAdmin) {
    // Admin has full access
  } else if (session.user.role === 'EDITOR') {
    // Editor has access ONLY if there is an assignment for a video of this project
    const assignment = await db.videoAssignment.findFirst({
      where: {
        editorId: session.user.id,
        video: { projectId: id },
      },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Project not found or access denied.' }, { status: 404 });
    }
  } else {
    // Regular user has access ONLY to their own projects
    whereClause.userId = session.user.id;
  }

  const project = await db.project.findFirst({
    where: whereClause,
    include: {
      scripts: { orderBy: { createdAt: 'desc' } },
      voices: { orderBy: { createdAt: 'desc' } },
      generationHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
      videos: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // If the project is completed, check for an R2 video record and generate a fresh signed URL
  if (project.status === 'COMPLETED') {
    const video = project.videos?.[0];

    if (video) {
      try {
        const freshSignedUrl = await generateSignedUrl(video.r2Key, 3600);
        project.videoUrl = freshSignedUrl;
        video.videoUrl = freshSignedUrl;
      } catch (err) {
        console.error('[PROJECTS_GET] Failed to generate fresh signed URL for video:', err);
        // Fall back to the url stored in the project/video record
        project.videoUrl = video.videoUrl;
      }

      if (video.thumbnailKey) {
        try {
          const freshThumbnailUrl = await generateSignedUrl(video.thumbnailKey, 3600);
          video.thumbnailUrl = freshThumbnailUrl;
        } catch (err) {
          console.error('[PROJECTS_GET] Failed to generate fresh signed URL for thumbnail:', err);
        }
      }
    }
  }

  return NextResponse.json({ project });
}

// PATCH /api/projects/:id
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;

  try {
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify ownership (only ADMIN or the user creator can update/patch)
    const isUserAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role || '');
    const whereClause: any = { id };
    if (!isUserAdmin) {
      whereClause.userId = session.user.id;
    }

    const existing = await db.project.findFirst({
      where: whereClause,
    });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = await db.project.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('[PROJECTS] PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects/:id
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;

  // Verify ownership (only ADMIN or the user creator can delete)
  const isUserAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role || '');
  const whereClause: any = { id };
  if (!isUserAdmin) {
    whereClause.userId = session.user.id;
  }

  const existing = await db.project.findFirst({
    where: whereClause,
  });
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  await db.project.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
