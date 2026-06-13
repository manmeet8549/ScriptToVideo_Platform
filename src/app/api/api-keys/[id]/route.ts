import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

// DELETE /api/api-keys/:id — revoke an API key
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;

  const existing = await db.apiKey.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  await db.apiKey.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
