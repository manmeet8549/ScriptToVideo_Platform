import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

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

type RouteParams = { params: { id: string } };

// GET /api/projects/:id
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      scripts: { orderBy: { createdAt: 'desc' } },
      voices: { orderBy: { createdAt: 'desc' } },
      generationHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({ project });
}

// PATCH /api/projects/:id
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db.project.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = await db.project.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('[PROJECTS] PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects/:id
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const existing = await db.project.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  await db.project.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
