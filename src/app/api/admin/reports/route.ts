import { auth } from '@/auth';
import { db } from '@/lib/db';

function convertToCSV(headers: string[], rows: (string | number | boolean | Date | null | undefined)[][]): string {
  const escapeField = (val: unknown) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeField).join(',');
  const bodyRows = rows.map((row) => row.map(escapeField).join(','));
  return [headerRow, ...bodyRows].join('\r\n');
}

export async function GET(req: Request) {
  const session = await auth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!session?.user?.id || !isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (!type) {
      return new Response('Missing report type parameter', { status: 400 });
    }

    let csvContent = '';
    const filename = `report_${type}_${Date.now()}.csv`;

    switch (type) {
      case 'users': {
        const users = await db.user.findMany({
          where: { role: { in: ['USER', 'ADMIN'] } },
          include: {
            creditWallet: true,
            _count: {
              select: {
                projects: true,
                videos: true,
                connectionsAsUser: true,
              },
            },
          },
        });

        const headers = [
          'User ID',
          'Name',
          'Email',
          'Role',
          'Account Status',
          'Script Credits',
          'Voice Credits',
          'Video Credits',
          'Publish Credits',
          'Storage Limit (GB)',
          'Storage Used (GB)',
          'Projects Count',
          'Videos Count',
          'Connected Editors',
          'Created At',
        ];

        const rows = users.map((u) => [
          u.id,
          u.name || 'N/A',
          u.email,
          u.role,
          u.accountStatus,
          u.creditWallet?.scriptCredits ?? 0,
          u.creditWallet?.voiceCredits ?? 0,
          u.creditWallet?.videoCredits ?? 0,
          u.creditWallet?.publishCredits ?? 0,
          u.creditWallet?.storageLimitGB ?? 10.0,
          u.creditWallet?.storageUsedGB ?? 0.0,
          u._count.projects,
          u._count.videos,
          u._count.connectionsAsUser,
          u.createdAt.toISOString(),
        ]);

        csvContent = convertToCSV(headers, rows);
        break;
      }

      case 'editors': {
        const editors = await db.user.findMany({
          where: { role: 'EDITOR' },
          include: {
            editorProfile: true,
            _count: {
              select: {
                connectionsAsEditor: true,
                assignmentsAsEditor: true,
              },
            },
          },
        });

        const headers = [
          'Editor ID',
          'Name',
          'Email',
          'Display Name',
          'Account Status',
          'Availability',
          'Skills',
          'Connected Clients',
          'Assignments Assigned',
          'Created At',
        ];

        const rows = editors.map((e) => [
          e.id,
          e.name || 'N/A',
          e.email,
          e.editorProfile?.displayName || 'N/A',
          e.accountStatus,
          e.editorProfile?.availability || 'AVAILABLE',
          (e.editorProfile?.skills || []).join('; '),
          e._count.connectionsAsEditor,
          e._count.assignmentsAsEditor,
          e.createdAt.toISOString(),
        ]);

        csvContent = convertToCSV(headers, rows);
        break;
      }

      case 'credits': {
        const txs = await db.creditTransaction.findMany({
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const headers = [
          'Transaction ID',
          'User ID',
          'User Name',
          'User Email',
          'Credit Type',
          'Amount',
          'Action',
          'Timestamp',
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = txs.map((t: any) => [
          t.id,
          t.userId,
          t.user.name || 'N/A',
          t.user.email,
          t.creditType,
          t.amount,
          t.action,
          t.createdAt.toISOString(),
        ]);

        csvContent = convertToCSV(headers, rows);
        break;
      }

      case 'publishing': {
        const published = await db.publishedVideo.findMany({
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const headers = [
          'Publish ID',
          'User ID',
          'User Name',
          'User Email',
          'Title',
          'Platform',
          'Status',
          'External Video ID',
          'Video URL',
          'Post ID',
          'Post URL',
          'Error Message',
          'Published At',
          'Created At',
        ];

        const rows = published.map((p) => [
          p.id,
          p.userId,
          p.user.name || 'N/A',
          p.user.email,
          p.title,
          p.platform,
          p.status,
          p.externalVideoId || 'N/A',
          p.videoUrl || 'N/A',
          p.postId || 'N/A',
          p.postUrl || 'N/A',
          p.errorMessage || 'N/A',
          p.publishedAt ? p.publishedAt.toISOString() : 'N/A',
          p.createdAt.toISOString(),
        ]);

        csvContent = convertToCSV(headers, rows);
        break;
      }

      case 'videos': {
        const videos = await db.video.findMany({
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const headers = [
          'Video ID',
          'User ID',
          'User Name',
          'User Email',
          'Title',
          'Status',
          'R2 Key',
          'Video URL',
          'File Size (MB)',
          'Duration (Seconds)',
          'Created At',
        ];

        const rows = videos.map((v) => [
          v.id,
          v.userId,
          v.user.name || 'N/A',
          v.user.email,
          v.title,
          v.status,
          v.r2Key,
          v.videoUrl,
          v.fileSize ? parseFloat((v.fileSize / (1024 * 1024)).toFixed(2)) : 0,
          v.duration || 0,
          v.createdAt.toISOString(),
        ]);

        csvContent = convertToCSV(headers, rows);
        break;
      }

      default:
        return new Response('Invalid report type', { status: 400 });
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[ADMIN/REPORTS] Error:', error);
    return new Response('Failed to generate report', { status: 500 });
  }
}
