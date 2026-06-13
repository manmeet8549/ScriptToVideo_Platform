import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ORG_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [
      totalUsers,
      activeUsers,
      pausedUsers,
      stoppedUsers,
      totalEditors,
      activeEditors,
      pausedEditors,
      stoppedEditors,
      projectsCreated,
      videosGenerated,
    ] = await Promise.all([
      db.user.count({ where: { role: 'USER', deletedAt: null } }),
      db.user.count({ where: { role: 'USER', accountStatus: 'ACTIVE', deletedAt: null } }),
      db.user.count({ where: { role: 'USER', accountStatus: 'PAUSED', deletedAt: null } }),
      db.user.count({ where: { role: 'USER', accountStatus: 'STOPPED', deletedAt: null } }),
      db.user.count({ where: { role: 'EDITOR', deletedAt: null } }),
      db.user.count({ where: { role: 'EDITOR', accountStatus: 'ACTIVE', deletedAt: null } }),
      db.user.count({ where: { role: 'EDITOR', accountStatus: 'PAUSED', deletedAt: null } }),
      db.user.count({ where: { role: 'EDITOR', accountStatus: 'STOPPED', deletedAt: null } }),
      db.project.count(),
      db.video.count({ where: { status: 'COMPLETED' } }),
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        paused: pausedUsers,
        stopped: stoppedUsers,
      },
      editors: {
        total: totalEditors,
        active: activeEditors,
        paused: pausedEditors,
        stopped: stoppedEditors,
      },
      projectsCreated,
      videosGenerated,
    });
  } catch (error) {
    console.error('[ADMIN/OVERVIEW] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin overview statistics.' }, { status: 500 });
  }
}
