import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/admin';
import { generatePresignedUploadUrl, generateSignedUrl } from '@/lib/r2';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const contentType = searchParams.get('contentType') || 'video/mp4';
    const hasThumbnail = searchParams.get('hasThumbnail') === 'true';

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required.' }, { status: 400 });
    }

    const assignment = await db.videoAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    // Verify caller is the assigned editor
    if (assignment.editorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Count existing edited versions to increment
    const count = await db.editedVideo.count({
      where: { assignmentId },
    });
    const version = count + 1;

    // Build unique keys
    const videoKey = `users/${assignment.userId}/assignments/${assignmentId}/v${version}.mp4`;
    const videoUrl = await generatePresignedUploadUrl(videoKey, contentType, 3600);

    let thumbnailUrl: string | undefined = undefined;
    let thumbnailKey: string | undefined = undefined;

    if (hasThumbnail) {
      thumbnailKey = `users/${assignment.userId}/assignments/${assignmentId}/v${version}_thumb.jpg`;
      thumbnailUrl = await generatePresignedUploadUrl(thumbnailKey, 'image/jpeg', 3600);
    }

    return NextResponse.json({
      videoUrl,
      thumbnailUrl,
      videoKey,
      thumbnailKey,
      version,
    });
  } catch (error) {
    console.error('[ASSIGNMENTS/UPLOAD/GET] Error:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assignmentId, videoKey, thumbnailKey, version } = await request.json();

    if (!assignmentId || !videoKey || version === undefined) {
      return NextResponse.json({ error: 'assignmentId, videoKey, and version are required.' }, { status: 400 });
    }

    const assignment = await db.videoAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        editor: { select: { name: true } },
        video: { select: { title: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    // Verify caller is the assigned editor
    if (assignment.editorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate signed URLs to store as access links (will be dynamically signed on GET, but good to store valid links)
    const signedVideoUrl = await generateSignedUrl(videoKey, 86400 * 365); // 1 year expiry
    let signedThumbnailUrl: string | null = null;
    if (thumbnailKey) {
      signedThumbnailUrl = await generateSignedUrl(thumbnailKey, 86400 * 365);
    }

    // Query R2 file size for storage monitoring
    const { getR2FileSize } = await import('@/lib/r2');
    let fileSize: number | null = null;
    try {
      fileSize = await getR2FileSize(videoKey);
    } catch (r2SizeErr) {
      console.error('[ASSIGNMENTS/UPLOAD] Failed to get R2 video size:', r2SizeErr);
    }

    // Wrap in a transaction to create EditedVideo and update assignment status
    const result = await db.$transaction(async (tx) => {
      // 1. Create EditedVideo record
      const edited = await tx.editedVideo.create({
        data: {
          assignmentId,
          originalVideoId: assignment.videoId,
          editedVideoUrl: signedVideoUrl,
          editedVideoKey: videoKey,
          thumbnailUrl: signedThumbnailUrl,
          thumbnailKey: thumbnailKey || null,
          version: parseInt(version, 10),
          fileSize,
          uploadedBy: session.user.id,
        },
      });

      // 2. Update assignment status and progress
      const updatedAssignment = await tx.videoAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'REVIEW',
          progress: 100,
        },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              videoUrl: true,
              thumbnailUrl: true,
            },
          },
          user: { select: { name: true, email: true } },
          editor: { select: { name: true, email: true } },
          editedVideos: true,
        },
      });

      return { edited, updatedAssignment };
    });

    // Recalculate client's storage used in background
    try {
      const { calculateStorageUsed } = await import('@/lib/credits');
      await calculateStorageUsed(assignment.userId);
    } catch (storageErr) {
      console.error('[ASSIGNMENTS/UPLOAD] Failed to recalculate storage used:', storageErr);
    }

    // Log activity
    await logActivity(session.user.id, 'ASSIGNMENT_UPLOADED', assignment.userId, {
      assignmentId,
      version,
      editedVideoId: result.edited.id,
    });

    // Notify user
    const editorName = assignment.editor.name || 'Editor';
    await db.notification.create({
      data: {
        userId: assignment.userId,
        title: 'New Edit Uploaded',
        message: `${editorName} has uploaded a new edited version (v${version}) of "${assignment.video.title}" for your review.`,
      },
    });

    return NextResponse.json({ success: true, assignment: result.updatedAssignment });
  } catch (error) {
    console.error('[ASSIGNMENTS/UPLOAD/POST] Error:', error);
    return NextResponse.json({ error: 'Failed to record upload.' }, { status: 500 });
  }
}
