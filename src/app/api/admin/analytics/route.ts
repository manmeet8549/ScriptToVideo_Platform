import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 1. Organization & Core Metrics
    const [
      totalUsers,
      activeUsers,
      pausedUsers,
      stoppedUsers,
      totalEditors,
      activeEditors,
      projectsCreated,
      videosGenerated,
      videosPublished,
      storageAggregate,
      creditsConsumed,
    ] = await Promise.all([
      db.user.count({ where: { role: 'USER' } }),
      db.user.count({ where: { role: 'USER', accountStatus: 'ACTIVE' } }),
      db.user.count({ where: { role: 'USER', accountStatus: 'PAUSED' } }),
      db.user.count({ where: { role: 'USER', accountStatus: 'STOPPED' } }),
      db.user.count({ where: { role: 'EDITOR' } }),
      db.user.count({ where: { role: 'EDITOR', accountStatus: 'ACTIVE' } }),
      db.project.count(),
      db.video.count(),
      db.publishedVideo.count({ where: { status: 'Published' } }),
      db.creditWallet.aggregate({
        _sum: { storageUsedGB: true },
      }),
      db.creditTransaction.count({
        where: { action: 'CONSUMED' },
      }),
    ]);

    // 2. Editor Productivity Analytics
    const editors = await db.user.findMany({
      where: { role: 'EDITOR' },
      select: {
        id: true,
        name: true,
        email: true,
        editorProfile: {
          select: {
            displayName: true,
            availability: true,
          },
        },
        assignmentsAsEditor: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    const editorProductivity = editors.map((editor) => {
      const allAssignments = editor.assignmentsAsEditor;
      const completed = allAssignments.filter((a) =>
        ['APPROVED', 'COMPLETED'].includes(a.status)
      );
      const pending = allAssignments.filter((a) =>
        ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(a.status)
      );

      // Compute average completion time (in hours)
      let avgCompletionTimeHours = 0;
      if (completed.length > 0) {
        const totalDurationMs = completed.reduce((sum, current) => {
          if (current.completedAt) {
            return sum + (new Date(current.completedAt).getTime() - new Date(current.createdAt).getTime());
          }
          return sum;
        }, 0);
        avgCompletionTimeHours = parseFloat((totalDurationMs / (1000 * 60 * 60 * completed.length)).toFixed(1));
      }

      // Estimate revision rate (approximation: if notes / state was ever in revision or has uploads version > 1,
      // but for simplicity we calculate if any assignment has REVISION_REQUESTED status or completed state)
      // We will count the number of assignments that are REVISION_REQUESTED or completed but had revisions.
      // For this API: revision rate is simply count of REVISION_REQUESTED / total assignments
      const revisionRate = allAssignments.length > 0
        ? parseFloat(((allAssignments.filter(a => a.status === 'REVISION_REQUESTED').length / allAssignments.length) * 100).toFixed(1))
        : 0;

      return {
        id: editor.id,
        name: editor.editorProfile?.displayName || editor.name || editor.email,
        email: editor.email,
        availability: editor.editorProfile?.availability || 'AVAILABLE',
        completedCount: completed.length,
        pendingCount: pending.length,
        avgCompletionTimeHours,
        revisionRatePercent: revisionRate,
      };
    });

    // 3. User Productivity Analytics
    const users = await db.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        name: true,
        email: true,
        projects: { select: { id: true, step: true, status: true } },
        videos: { select: { id: true } },
        publishedVideos: { select: { id: true, status: true } },
        assignmentsAsUser: { select: { id: true } },
        creditWallet: {
          select: {
            scriptCredits: true,
            voiceCredits: true,
            videoCredits: true,
            publishCredits: true,
          },
        },
      },
    });

    const userProductivity = users.map((u) => {
      const scriptsCount = u.projects.filter(p => p.step !== 'IDEA').length;
      const voicesCount = u.projects.filter(p => ['VOICE', 'VIDEO'].includes(p.step)).length;
      const videosCount = u.videos.length;
      const publishedCount = u.publishedVideos.filter(p => p.status === 'Published').length;

      return {
        id: u.id,
        name: u.name || 'Workspace User',
        email: u.email,
        scriptsCount,
        voicesCount,
        videosCount,
        publishedCount,
        assignmentsCount: u.assignmentsAsUser.length,
        credits: u.creditWallet || { scriptCredits: 0, voiceCredits: 0, videoCredits: 0, publishCredits: 0 },
      };
    });

    // 4. Publishing Analytics (Platform-wise success)
    const publishedList = await db.publishedVideo.findMany({
      select: { platform: true, status: true },
    });

    const platforms = ['youtube', 'linkedin', 'facebook', 'instagram', 'twitter'];
    const publishingAnalytics = platforms.map((p) => {
      const platformVideos = publishedList.filter((v) => v.platform === p);
      const success = platformVideos.filter((v) => v.status === 'Published').length;
      const failed = platformVideos.filter((v) => v.status.startsWith('Failed')).length;
      const pending = platformVideos.filter((v) =>
        ['Preparing video...', 'Uploading', 'Processing'].some(s => v.status.startsWith(s))
      ).length;

      const rate = platformVideos.length > 0 
        ? Math.round((success / platformVideos.length) * 100) 
        : 100;

      return {
        platform: p,
        total: platformVideos.length,
        success,
        failed,
        pending,
        successRatePercent: rate,
      };
    });

    // 5. Global Monitoring Center (Live Queues)
    const [
      liveProjectsList,
      activeGenerationsList,
      assignmentsInProgressList,
      publishingQueueList,
      failedJobsCount,
    ] = await Promise.all([
      db.project.findMany({
        where: {
          status: { in: ['SCRIPTING', 'VOICING', 'GENERATING'] },
        },
        select: { id: true, name: true, status: true, updatedAt: true, user: { select: { name: true, email: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      db.generationHistory.findMany({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        select: { id: true, type: true, status: true, createdAt: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.videoAssignment.findMany({
        where: { status: { in: ['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'] } },
        select: { id: true, status: true, progress: true, video: { select: { title: true } }, editor: { select: { name: true, email: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      db.publishedVideo.findMany({
        where: {
          status: {
            notIn: ['Published', 'Failed'],
          },
        },
        select: { id: true, platform: true, status: true, title: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.publishedVideo.count({
        where: { status: { startsWith: 'Failed' } },
      }),
    ]);

    const liveProjects = liveProjectsList.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
      clientName: p.user.name || p.user.email,
    }));

    const activeGenerations = activeGenerationsList.map(g => ({
      id: g.id,
      type: g.type,
      status: g.status,
      createdAt: g.createdAt.toISOString(),
      clientName: g.user.name || g.user.email,
    }));

    const assignmentsInProgress = assignmentsInProgressList.map(a => ({
      id: a.id,
      title: a.video.title,
      status: a.status,
      progress: a.progress,
      editorName: a.editor.name || a.editor.email,
    }));

    const publishingQueue = publishingQueueList.map(p => ({
      id: p.id,
      platform: p.platform,
      status: p.status,
      title: p.title,
      clientName: p.user.name || p.user.email,
    }));

    return NextResponse.json({
      organization: {
        totalUsers,
        activeUsers,
        pausedUsers,
        stoppedUsers,
        totalEditors,
        activeEditors,
        projectsCreated,
        videosGenerated,
        videosPublished,
        storageUsedGB: parseFloat((storageAggregate._sum.storageUsedGB || 0).toFixed(2)),
        creditsConsumed,
      },
      editorProductivity,
      userProductivity,
      publishingAnalytics,
      monitoring: {
        liveProjects,
        activeGenerations,
        assignmentsInProgress,
        publishingQueue,
        failedJobsCount,
      },
    });
  } catch (error) {
    console.error('[ADMIN/ANALYTICS] Error:', error);
    return NextResponse.json({ error: 'Failed to compile analytics.' }, { status: 500 });
  }
}
