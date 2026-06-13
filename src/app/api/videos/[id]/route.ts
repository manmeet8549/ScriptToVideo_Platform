import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deleteFromR2 } from '@/lib/r2';

type RouteParams = { params: { id: string } };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    const whereClause: any = { id };
    if (session.user.organizationId) {
      whereClause.organizationId = session.user.organizationId;
    } else {
      whereClause.userId = session.user.id;
    }

    // 1. Verify existence and ownership
    const video = await db.video.findFirst({
      where: whereClause,
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // 2. Delete file from Cloudflare R2
    try {
      console.log(`[VIDEO_DELETE] Deleting file from R2: ${video.r2Key}`);
      await deleteFromR2(video.r2Key);
    } catch (r2Error) {
      console.error('[VIDEO_DELETE] Error deleting object from Cloudflare R2:', r2Error);
      // We continue deleting the database record so the database doesn't get out of sync 
      // or block the user on R2 connection issues.
    }

    // 3. Delete database record & reset associated project step/url
    console.log(`[VIDEO_DELETE] Removing video record ${id} and resetting project ${video.projectId}`);
    await db.$transaction([
      db.video.delete({
        where: { id },
      }),
      db.project.update({
        where: { id: video.projectId },
        data: {
          videoUrl: null,
          status: 'DRAFT',
          step: 'VOICE', // Reset back to voice-completed step (ready to generate video)
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('[VIDEO_DELETE] Error deleting video:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
