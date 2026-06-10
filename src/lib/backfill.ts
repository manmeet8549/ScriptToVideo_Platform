// Database client and encryption utils
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { uploadToR2, generateSignedUrl } from '@/lib/r2';

/**
 * Audit and backfill completed or generating HeyGen videos to Cloudflare R2 and PostgreSQL.
 * This runs automatically for the given user ID to repair/recover any missing video records.
 */
export async function backfillUserVideos(userId: string): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[BACKFILL][${timestamp}] Starting R2 backfill audit for user: ${userId}`);

  try {
    // 1. Find all projects belonging to the user that might have a HeyGen video
    const projects = await db.project.findMany({
      where: {
        userId,
        videoUrl: {
          not: null,
        },
      },
      include: {
        videos: true,
      },
    });

    const pendingBackfills = projects.filter((p) => {
      // If there's already a completed video record for this project in the Video table, no backfill needed
      if (p.videos && p.videos.some((v) => v.status === 'COMPLETED')) {
        return false;
      }
      const url = p.videoUrl || '';
      return url.startsWith('heygen:') || url.includes('heygen.ai');
    });

    if (pendingBackfills.length > 0) {
      console.log(
        `[BACKFILL][${timestamp}] Found ${pendingBackfills.length} projects requiring backfill/sync:`,
        pendingBackfills.map((p) => ({ id: p.id, name: p.name, url: p.videoUrl }))
      );

      // 2. Retrieve user's HeyGen key
      const providerKey = await db.providerKey.findUnique({
        where: { userId_provider: { userId, provider: 'HEYGEN' } },
      });

      if (!providerKey) {
        console.warn(`[BACKFILL][${timestamp}] HeyGen key not configured for user: ${userId}. Skipping Phase 1.`);
      } else {
        let heygenKey = '';
        try {
          heygenKey = decrypt(providerKey.value);
        } catch (err) {
          console.error(`[BACKFILL][${timestamp}] Failed to decrypt HeyGen key for user ${userId}:`, err);
        }

        if (heygenKey) {
          // 3. Process each backfill candidate
          for (const project of pendingBackfills) {
            try {
              // Parse the HeyGen Video ID
              let videoId = '';
              const url = project.videoUrl || '';

              if (url.startsWith('heygen:')) {
                videoId = url.split(':')[1] || '';
              } else if (url.includes('heygen.ai')) {
                // Extract 32-char hex string from filename
                const match = url.match(/\/([a-f0-9]{32})\.mp4/);
                if (match) {
                  videoId = match[1] || '';
                }
              }

              if (!videoId) {
                console.warn(`[BACKFILL][${timestamp}] Could not extract HeyGen video ID from URL "${url}" for project ${project.id}`);
                continue;
              }

              console.log(`[BACKFILL][${timestamp}] Auditing video status for project "${project.name}" (ID: ${project.id}), HeyGen video ID: "${videoId}"`);

              // Check video status in HeyGen
              const hgResponse = await fetch(
                `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
                {
                  headers: {
                    'X-Api-Key': heygenKey,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (!hgResponse.ok) {
                const errBody = await hgResponse.json().catch(() => ({}));
                console.error(`[BACKFILL][${timestamp}] HeyGen API status check failed for video ${videoId}:`, hgResponse.status, errBody);
                continue;
              }

              const hgData = await hgResponse.json();
              const hgStatus = hgData?.data?.status;
              const directVideoUrl = hgData?.data?.video_url;

              console.log(`[BACKFILL][${timestamp}] HeyGen status for video ID "${videoId}" is "${hgStatus}"`);

              if (hgStatus === 'completed' && directVideoUrl) {
                console.log(`[BACKFILL][${timestamp}] Video "${videoId}" is completed. Downloading MP4 from HeyGen...`);

                const mp4Response = await fetch(directVideoUrl);
                if (!mp4Response.ok) {
                  console.error(`[BACKFILL][${timestamp}] Failed to download video binary from ${directVideoUrl}. HTTP status: ${mp4Response.status}`);
                  continue;
                }

                const arrayBuffer = await mp4Response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileSize = buffer.byteLength;

                let duration: number | null = null;
                const hgDuration = hgData?.data?.duration;
                if (typeof hgDuration === 'number') {
                  duration = hgDuration;
                }

                const r2Key = `videos/${userId}/${project.id}.mp4`;
                console.log(`[BACKFILL][${timestamp}] Uploading to Cloudflare R2 with key: ${r2Key} (${fileSize} bytes)`);
                await uploadToR2(r2Key, buffer, 'video/mp4');

                // Download and Upload Thumbnail to R2
                const heygenThumbnailUrl = hgData?.data?.thumbnail_url ?? hgData?.thumbnail_url ?? '';
                let thumbnailUrl: string | null = heygenThumbnailUrl || null;
                let thumbnailKey: string | null = null;

                if (heygenThumbnailUrl) {
                  try {
                    console.log(`[BACKFILL][${timestamp}] Downloading thumbnail from HeyGen: ${heygenThumbnailUrl}`);
                    const thumbResponse = await fetch(heygenThumbnailUrl);
                    if (thumbResponse.ok) {
                      const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
                      thumbnailKey = `videos/${userId}/${project.id}-thumbnail.jpg`;
                      console.log(`[BACKFILL][${timestamp}] Uploading thumbnail to R2 with key: ${thumbnailKey}`);
                      await uploadToR2(thumbnailKey, thumbBuffer, 'image/jpeg');
                    }
                  } catch (thumbError) {
                    console.error(`[BACKFILL][${timestamp}] Failed to upload thumbnail to R2:`, thumbError);
                  }
                }

                // Generate a signed URL for immediate use
                const signedUrl = await generateSignedUrl(r2Key, 3600);
                if (thumbnailKey) {
                  try {
                    thumbnailUrl = await generateSignedUrl(thumbnailKey, 3600);
                  } catch (thumbSignErr) {
                    console.error(`[BACKFILL][${timestamp}] Failed to sign thumbnail URL:`, thumbSignErr);
                  }
                }
                const videoTitle = project.name || 'Generated Avatar Video';

                // Insert into database and update project record in a transaction
                console.log(`[BACKFILL][${timestamp}] Creating Video record and updating project state in DB...`);
                await db.$transaction([
                  db.video.create({
                    data: {
                      userId,
                      projectId: project.id,
                      title: videoTitle,
                      status: 'COMPLETED',
                      r2Key,
                      videoUrl: signedUrl,
                      fileSize,
                      duration,
                      thumbnailUrl,
                      thumbnailKey,
                      thumbnailGeneratedAt: new Date(),
                    },
                  }),
                  db.project.update({
                    where: { id: project.id },
                    data: {
                      videoUrl: signedUrl,
                      step: 'VIDEO',
                      status: 'COMPLETED',
                    },
                  }),
                  // Check if there is an active VIDEO history entry, update it, or create a completed one
                  db.generationHistory.updateMany({
                    where: {
                      projectId: project.id,
                      type: 'VIDEO',
                      status: { in: ['PENDING', 'IN_PROGRESS'] },
                    },
                    data: {
                      status: 'COMPLETED',
                      metadata: {
                        videoUrl: signedUrl,
                        heygenVideoId: videoId,
                        duration,
                        r2Key,
                        thumbnailUrl,
                        thumbnailKey,
                      },
                    },
                  }),
                ]);

                console.log(`[BACKFILL][${timestamp}] Successfully backfilled project "${project.name}" (ID: ${project.id}) to R2 & DB.`);
              } else if (hgStatus === 'failed') {
                console.log(`[BACKFILL][${timestamp}] Video ${videoId} has FAILED in HeyGen. Updating project and history status...`);

                await db.$transaction([
                  db.project.update({
                    where: { id: project.id },
                    data: {
                      status: 'FAILED',
                    },
                  }),
                  db.generationHistory.updateMany({
                    where: {
                      projectId: project.id,
                      type: 'VIDEO',
                      status: { in: ['PENDING', 'IN_PROGRESS'] },
                    },
                    data: {
                      status: 'FAILED',
                      metadata: {
                        error: hgData?.data?.error || 'HeyGen video generation failed',
                        heygenVideoId: videoId,
                      },
                    },
                  }),
                ]);
              } else {
                console.log(`[BACKFILL][${timestamp}] Video "${videoId}" is still in status "${hgStatus}". Waiting for next check.`);
              }
            } catch (err) {
              console.error(`[BACKFILL][${timestamp}] Failed processing backfill for project ${project.id}:`, err);
            }
          }
        }
      }
    } else {
      console.log(`[BACKFILL][${timestamp}] No pending video backfills found for user: ${userId}`);
    }

    // Phase 2: Scan for completed videos that are missing thumbnails and backfill them
    const videosMissingThumbnails = await db.video.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        OR: [
          { thumbnailUrl: null },
          { thumbnailKey: null },
        ],
      },
    });

    if (videosMissingThumbnails.length > 0) {
      console.log(`[BACKFILL][${timestamp}] Found ${videosMissingThumbnails.length} completed videos missing thumbnails. Processing...`);
      
      // Retrieve user's HeyGen key (if not already retrieved)
      let heygenKey = '';
      const providerKey = await db.providerKey.findUnique({
        where: { userId_provider: { userId, provider: 'HEYGEN' } },
      });
      if (providerKey) {
        try {
          heygenKey = decrypt(providerKey.value);
        } catch (err) {
          console.error(`[BACKFILL][${timestamp}] Failed to decrypt HeyGen key for thumbnail backfill:`, err);
        }
      }

      if (heygenKey) {
        for (const video of videosMissingThumbnails) {
          try {
            console.log(`[BACKFILL][${timestamp}] Auditing thumbnail for completed video "${video.title}" (ID: ${video.id})`);
            
            // Find HeyGen video ID from generation history
            const history = await db.generationHistory.findFirst({
              where: {
                projectId: video.projectId,
                type: 'VIDEO',
                status: 'COMPLETED',
              },
              orderBy: { createdAt: 'desc' },
            });

            let heygenVideoId = '';
            if (history && history.metadata) {
              const metadata = history.metadata as Record<string, unknown>;
              if (metadata['heygenVideoId']) {
                heygenVideoId = String(metadata['heygenVideoId']);
              } else if (metadata['heygenVideoUrl']) {
                const match = String(metadata['heygenVideoUrl']).match(/\/([a-f0-9]{32})\.mp4/);
                if (match) heygenVideoId = match[1];
              } else if (metadata['videoUrl'] && String(metadata['videoUrl']).includes('heygen.ai')) {
                const match = String(metadata['videoUrl']).match(/\/([a-f0-9]{32})\.mp4/);
                if (match) heygenVideoId = match[1];
              }
            }

            if (!heygenVideoId) {
              // Try parsing from project videoUrl or metadata if not found
              const project = await db.project.findUnique({ where: { id: video.projectId } });
              const url = project?.videoUrl || '';
              if (url.includes('heygen.ai') || url.startsWith('heygen:')) {
                if (url.startsWith('heygen:')) {
                  heygenVideoId = url.split(':')[1] || '';
                } else {
                  const match = url.match(/\/([a-f0-9]{32})\.mp4/);
                  if (match) heygenVideoId = match[1] || '';
                }
              }
            }

            if (!heygenVideoId) {
              console.warn(`[BACKFILL][${timestamp}] Could not determine HeyGen Video ID for video "${video.title}" (ID: ${video.id}). Skipping.`);
              continue;
            }

            console.log(`[BACKFILL][${timestamp}] Fetching HeyGen status for Video ID "${heygenVideoId}" to retrieve thumbnail URL...`);
            const hgResponse = await fetch(
              `https://api.heygen.com/v1/video_status.get?video_id=${heygenVideoId}`,
              {
                headers: {
                  'X-Api-Key': heygenKey,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!hgResponse.ok) {
              console.error(`[BACKFILL][${timestamp}] HeyGen API status check failed for video ${heygenVideoId} (status: ${hgResponse.status})`);
              continue;
            }

            const hgData = await hgResponse.json();
            const heygenThumbnailUrl = hgData?.data?.thumbnail_url ?? hgData?.thumbnail_url ?? '';

            if (heygenThumbnailUrl) {
              console.log(`[BACKFILL][${timestamp}] Downloading thumbnail from HeyGen: ${heygenThumbnailUrl}`);
              const thumbResponse = await fetch(heygenThumbnailUrl);
              if (thumbResponse.ok) {
                const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
                const thumbnailKey = `videos/${userId}/${video.projectId}-thumbnail.jpg`;
                console.log(`[BACKFILL][${timestamp}] Uploading thumbnail to R2 with key: ${thumbnailKey}`);
                await uploadToR2(thumbnailKey, thumbBuffer, 'image/jpeg');

                const signedThumbnailUrl = await generateSignedUrl(thumbnailKey, 3600);

                // Update database
                await db.video.update({
                  where: { id: video.id },
                  data: {
                    thumbnailUrl: signedThumbnailUrl,
                    thumbnailKey,
                    thumbnailGeneratedAt: new Date(),
                  },
                });

                console.log(`[BACKFILL][${timestamp}] Successfully backfilled thumbnail for video "${video.title}"`);
              } else {
                console.warn(`[BACKFILL][${timestamp}] Failed to download thumbnail from ${heygenThumbnailUrl}: Status ${thumbResponse.status}`);
              }
            } else {
              console.warn(`[BACKFILL][${timestamp}] No thumbnail URL returned from HeyGen for Video ID ${heygenVideoId}`);
            }
          } catch (videoErr) {
            console.error(`[BACKFILL][${timestamp}] Error processing thumbnail backfill for video ${video.id}:`, videoErr);
          }
        }
      }
    }
  } catch (err) {
    console.error(`[BACKFILL][${timestamp}] Error during backfill audit process:`, err);
  }
}
