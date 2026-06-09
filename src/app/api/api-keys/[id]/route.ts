import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

type RouteParams = { params: { id: string } };

// DELETE /api/api-keys/:id — revoke an API key
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await db.apiKey.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  await db.apiKey.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
