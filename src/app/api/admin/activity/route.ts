import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!session?.user?.id || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const logs = await db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Gather all user IDs to resolve details in a single query
    const userIds = new Set<string>();
    logs.forEach((log) => {
      if (log.actorId) userIds.add(log.actorId);
      if (log.targetUserId) userIds.add(log.targetUserId);
    });

    const users = await db.user.findMany({
      where: {
        id: { in: Array.from(userIds) },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const enrichedLogs = logs.map((log) => {
      const actor = userMap.get(log.actorId);
      const targetUser = log.targetUserId ? userMap.get(log.targetUserId) : null;

      return {
        id: log.id,
        action: log.action,
        actorId: log.actorId,
        actorName: actor?.name || actor?.email || 'Unknown',
        actorEmail: actor?.email,
        actorRole: log.actorRole || actor?.role || 'SYSTEM',
        targetUserId: log.targetUserId,
        targetUserName: targetUser?.name || targetUser?.email || null,
        targetUserEmail: targetUser?.email || null,
        targetId: log.targetId,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ logs: enrichedLogs });
  } catch (error) {
    console.error('[ADMIN/ACTIVITY] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs.' }, { status: 500 });
  }
}
