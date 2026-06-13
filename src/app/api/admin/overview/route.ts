import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ORG_ADMIN')) {
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
      activeProjects,
      videosGenerated,
      publishedVideos,
      latestHistory,
      latestPublishing,
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
      db.project.count({ where: { status: { in: ['SCRIPTING', 'VOICING', 'GENERATING'] } } }),
      db.video.count({ where: { status: 'COMPLETED' } }),
      db.publishedVideo.count(),
      db.generationHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      }),
      db.publishedVideo.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    // Map history to standard queue format
    const historyJobs = latestHistory.map((g) => {
      let mappedStatus = 'Pending';
      if (g.status === 'RUNNING' || g.status === 'IN_PROGRESS') mappedStatus = 'Running';
      else if (g.status === 'COMPLETED') mappedStatus = 'Completed';
      else if (g.status === 'FAILED') mappedStatus = 'Failed';
      else if (g.status === 'PAUSED') mappedStatus = 'Paused';
      else if (g.status === 'CANCELLED') mappedStatus = 'Cancelled';

      return {
        id: g.id,
        type: g.type === 'SCRIPT' ? 'Script Job' : g.type === 'VOICE' ? 'Voice Job' : 'Video Job',
        name: g.project?.name || 'Asset Generation',
        client: g.user.name || g.user.email,
        status: mappedStatus,
        createdAt: g.createdAt.toISOString(),
      };
    });

    // Map publishing to standard queue format
    const publishingJobs = latestPublishing.map((p) => {
      let mappedStatus = 'Pending';
      const statusLower = p.status.toLowerCase();
      if (statusLower.includes('uploading') || statusLower.includes('processing')) mappedStatus = 'Running';
      else if (statusLower.includes('published')) mappedStatus = 'Completed';
      else if (statusLower.includes('failed')) mappedStatus = 'Failed';
      else if (statusLower.includes('preparing') || statusLower.includes('pending')) mappedStatus = 'Pending';

      return {
        id: p.id,
        type: 'Publishing Job',
        name: p.title,
        client: p.user.name || p.user.email,
        status: mappedStatus,
        createdAt: p.createdAt.toISOString(),
      };
    });

    // Merge and take top 10
    const queue = [...historyJobs, ...publishingJobs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

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
      activeProjects,
      videosGenerated,
      publishedVideos,
      queue,
    });
  } catch (error) {
    console.error('[ADMIN/OVERVIEW] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin overview statistics.' }, { status: 500 });
  }
}
