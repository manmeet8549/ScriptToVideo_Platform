import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generateSignedUrl } from '@/lib/r2';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const assignments = await db.videoAssignment.findMany({
      where: { editorId: session.user.id },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            videoUrl: true,
            r2Key: true,
            thumbnailUrl: true,
            thumbnailKey: true,
          },
        },
        user: { select: { name: true, email: true } },
        editor: { select: { name: true, email: true } },
        editedVideos: {
          orderBy: { version: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sign the R2 URLs for video assets
    const signedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        // Sign original video URLs
        let originalVideoUrl = assignment.video.videoUrl;
        let originalThumbnailUrl = assignment.video.thumbnailUrl;
        try {
          originalVideoUrl = await generateSignedUrl(assignment.video.r2Key, 3600);
          if (assignment.video.thumbnailKey) {
            originalThumbnailUrl = await generateSignedUrl(assignment.video.thumbnailKey, 3600);
          }
        } catch (err) {
          console.error(`[EDITOR_ASSIGNMENTS] Failed to sign original video assets:`, err);
        }

        // Sign edited video URLs
        const signedEditedVideos = await Promise.all(
          assignment.editedVideos.map(async (edited) => {
            let editedVideoUrl = edited.editedVideoUrl;
            let editedThumbnailUrl = edited.thumbnailUrl;
            try {
              editedVideoUrl = await generateSignedUrl(edited.editedVideoKey, 3600);
              if (edited.thumbnailKey) {
                editedThumbnailUrl = await generateSignedUrl(edited.thumbnailKey, 3600);
              }
            } catch (err) {
              console.error(`[EDITOR_ASSIGNMENTS] Failed to sign edited video assets:`, err);
            }
            return {
              ...edited,
              editedVideoUrl,
              thumbnailUrl: editedThumbnailUrl,
            };
          })
        );

        return {
          ...assignment,
          video: {
            id: assignment.video.id,
            title: assignment.video.title,
            videoUrl: originalVideoUrl,
            thumbnailUrl: originalThumbnailUrl,
          },
          editedVideos: signedEditedVideos,
        };
      })
    );

    return NextResponse.json({ assignments: signedAssignments });
  } catch (error) {
    console.error('[ASSIGNMENTS/EDITOR] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve editor assignments.' }, { status: 500 });
  }
}
