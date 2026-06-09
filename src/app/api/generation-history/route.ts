import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const logSchema = z.object({
  type: z.enum(['SCRIPT', 'VOICE', 'VIDEO']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
  projectId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/generation-history
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const projectId = searchParams.get('projectId');

  const history = await db.generationHistory.findMany({
    where: {
      userId: session.user.id,
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ history });
}

// POST /api/generation-history — log a generation event
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = logSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const entry = await db.generationHistory.create({
      data: {
        type: parsed.data.type,
        status: parsed.data.status,
        projectId: parsed.data.projectId,
        metadata: parsed.data.metadata as Prisma.InputJsonValue,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('[HISTORY] POST Error:', error);
    return NextResponse.json({ error: 'Failed to log history' }, { status: 500 });
  }
}
