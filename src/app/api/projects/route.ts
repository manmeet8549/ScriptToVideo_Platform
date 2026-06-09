import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

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

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { scripts: true, voices: true },
      },
    },
  });

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
