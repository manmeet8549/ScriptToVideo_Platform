import { Publisher, PublishOptions, PublishResult, ProgressCallback } from './types';
import { getR2Client, generateSignedUrl } from '@/lib/r2';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

/**
 * Refreshes an expired Google OAuth access token using the refresh token.
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    throw new Error('❌ Google API credentials not configured.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[YOUTUBE_PUBLISHER] Token refresh failed. Status: ${res.status}, Response: ${errText}`);
    throw new Error(`❌ OAuth token expired: ${res.status} ${res.statusText} - ${errText}`);
  }

  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

export class YouTubePublisher implements Publisher {
  private decryptedAccessToken: string;
  private decryptedRefreshToken: string | null;
  private tokenExpiry: Date | null;
  private onTokenRefreshed?: (newAccessToken: string, newExpiry: Date) => Promise<void>;

  constructor(
    accessToken: string,
    refreshToken: string | null,
    tokenExpiry: Date | null,
    onTokenRefreshed?: (newAccessToken: string, newExpiry: Date) => Promise<void>
  ) {
    this.decryptedAccessToken = accessToken;
    this.decryptedRefreshToken = refreshToken;
    this.tokenExpiry = tokenExpiry;
    this.onTokenRefreshed = onTokenRefreshed;
  }

  /**
   * Helper to get a valid access token. Refreshes if expired.
   */
  private async getValidAccessToken(): Promise<string> {
    const twoMinutes = 2 * 60 * 1000;
    if (this.tokenExpiry && this.tokenExpiry.getTime() - twoMinutes > Date.now()) {
      return this.decryptedAccessToken;
    }

    if (!this.decryptedRefreshToken) {
      throw new Error('❌ OAuth token expired.');
    }

    console.log('[YOUTUBE_PUBLISHER] Access token expired. Refreshing token...');
    try {
      const refreshed = await refreshGoogleToken(this.decryptedRefreshToken);
      this.decryptedAccessToken = refreshed.accessToken;
      this.tokenExpiry = refreshed.expiresAt;

      if (this.onTokenRefreshed) {
        await this.onTokenRefreshed(refreshed.accessToken, refreshed.expiresAt);
      }

      return refreshed.accessToken;
    } catch (err) {
      console.error('[YOUTUBE_PUBLISHER] Token refresh procedure encountered an error:', err);
      throw new Error('❌ OAuth token expired.');
    }
  }

  async publish(
    videoR2Key: string,
    options: PublishOptions,
    onProgress?: ProgressCallback
  ): Promise<PublishResult> {
    try {
      const client_id = process.env.GOOGLE_CLIENT_ID;
      const client_secret = process.env.GOOGLE_CLIENT_SECRET;

      // Completely disable mock publishing in production
      const isMockMode = process.env.NODE_ENV !== 'production' && process.env.MOCK_PUBLISH === 'true';

      if (!client_id || !client_secret) {
        if (!isMockMode) {
          throw new Error('❌ Google API credentials not configured.');
        }
      }

      if (isMockMode && (!client_id || !client_secret)) {
        console.log('[YOUTUBE_PUBLISHER] Google API credentials missing. Running in MOCK DEVELOPER MODE...');
        return this.simulateMockPublish(videoR2Key, options, onProgress);
      }

      // 1. Get valid access token (refreshes if needed)
      const token = await this.getValidAccessToken();

      // 1.5 Verify channel ownership before upload
      console.log('[YOUTUBE_PUBLISHER] Verifying channel ownership and credentials...');
      const verifyRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        console.error(`[YOUTUBE_PUBLISHER] channels.list failed. Status: ${verifyRes.status}, Response: ${errText}`);
        throw new Error(`❌ YouTube upload failed: Channel verification failed: ${verifyRes.status} - ${errText}`);
      }

      const verifyData = await verifyRes.json();
      if (!verifyData.items || verifyData.items.length === 0) {
        throw new Error('❌ YouTube upload failed: No YouTube channel found for this Google account.');
      }

      const channel = verifyData.items[0];
      const channelId = channel.id;
      const channelTitle = channel.snippet?.title || 'Unknown';
      const subCount = channel.statistics?.subscriberCount || '0';
      console.log(`[YOUTUBE_PUBLISHER] Verified Channel: ${channelTitle} (ID: ${channelId}, Subscribers: ${subCount})`);

    // 2. Fetch video size from Cloudflare R2 via S3 SDK
    console.log(`[YOUTUBE_PUBLISHER] Probing file size in R2 for key: "${videoR2Key}"`);
    const r2Client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME || '';
    
    let totalBytes = 0;
    try {
      const headCmd = new HeadObjectCommand({
        Bucket: bucket,
        Key: videoR2Key,
      });
      const headRes = await r2Client.send(headCmd);
      totalBytes = headRes.ContentLength || 0;
      console.log(`[YOUTUBE_PUBLISHER] Target video file size: ${totalBytes} bytes`);
    } catch (err) {
      console.error('[YOUTUBE_PUBLISHER] S3 HeadObject failed. Falling back to signed URL HEAD request...', err);
      // Fallback: fetch content-length via signed URL HEAD request
      const signedUrl = await generateSignedUrl(videoR2Key, 600);
      const headRes = await fetch(signedUrl, { method: 'HEAD' });
      totalBytes = parseInt(headRes.headers.get('content-length') || '0', 10);
    }

    if (totalBytes === 0) {
      throw new Error(`Video file is empty or does not exist in R2 bucket.`);
    }

    // 3. Initiate Resumable Session with YouTube API
    console.log('[YOUTUBE_PUBLISHER] Initiating YouTube Resumable Upload session...');
    const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(totalBytes),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify({
        snippet: {
          title: options.title,
          description: options.description,
          tags: options.tags || [],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: options.visibility || 'public',
          selfDeclaredMadeForKids: false,
        }
      }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error(`[YOUTUBE_PUBLISHER] videos.insert (initiate) failed. Status: ${initRes.status}, Response: ${errText}`);
      throw new Error(`Failed to initiate YouTube upload session: ${initRes.status} - ${errText}`);
    }

    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) {
      throw new Error('YouTube API did not return an upload session URL in the Location header.');
    }

    // 4. Stream R2 file in chunks and PUT to YouTube resumable session
    console.log('[YOUTUBE_PUBLISHER] Starting chunked video streaming to YouTube...');
    const chunkSize = 2 * 1024 * 1024; // 2MB chunk size (must be a multiple of 256KB)
    let startByte = 0;
    const signedR2Url = await generateSignedUrl(videoR2Key, 3600);

    while (startByte < totalBytes) {
      const endByte = Math.min(startByte + chunkSize - 1, totalBytes - 1);
      const chunkLength = endByte - startByte + 1;

      console.log(`[YOUTUBE_PUBLISHER] Streaming range: ${startByte}-${endByte}/${totalBytes} (${chunkLength} bytes)`);

      // Fetch chunk range from R2
      const r2Res = await fetch(signedR2Url, {
        headers: {
          Range: `bytes=${startByte}-${endByte}`,
        },
      });

      if (!r2Res.ok) {
        throw new Error(`Failed to fetch chunk ${startByte}-${endByte} from R2: ${r2Res.status} ${r2Res.statusText}`);
      }

      const chunkBuffer = await r2Res.arrayBuffer();

      // PUT chunk to YouTube Resumable Session URL
      const ytPutRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': String(chunkLength),
          'Content-Range': `bytes ${startByte}-${endByte}/${totalBytes}`,
        },
        body: chunkBuffer,
      });

      if (ytPutRes.status === 308) {
        // Resumable Upload 308 - expected intermediate response code
        startByte += chunkLength;
        if (onProgress) {
          onProgress(startByte, totalBytes);
        }
      } else if (ytPutRes.ok || ytPutRes.status === 200 || ytPutRes.status === 201) {
        // Final upload complete!
        const videoData = await ytPutRes.json();
        const externalVideoId = videoData.id;
        if (!externalVideoId) {
          console.error('[YOUTUBE_PUBLISHER] Final response from YouTube did not contain video ID:', videoData);
          throw new Error('YouTube API response missing video ID.');
        }
        console.log(`[YOUTUBE_PUBLISHER] Upload completed successfully! YouTube Video ID: ${externalVideoId}`);
        
        return {
          externalVideoId,
          videoUrl: `https://www.youtube.com/watch?v=${externalVideoId}`,
        };
      } else {
        const errText = await ytPutRes.text();
        console.error(`[YOUTUBE_PUBLISHER] Chunk upload failed. Status: ${ytPutRes.status}, Response: ${errText}`);
        throw new Error(`YouTube chunk upload failed at range ${startByte}-${endByte}: ${ytPutRes.status} - ${errText}`);
      }
    }

    throw new Error('Resumable upload loop terminated without a final response.');
    } catch (err) {
      console.error('[YOUTUBE_PUBLISHER] Publish failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('❌')) {
        throw err;
      }
      throw new Error(`❌ YouTube upload failed: ${msg}`);
    }
  }

  /**
   * Simulates a YouTube upload for testing when Google API keys are missing.
   */
  private async simulateMockPublish(
    videoR2Key: string,
    options: PublishOptions,
    onProgress?: ProgressCallback
  ): Promise<PublishResult> {
    const mockTotalBytes = 15.5 * 1024 * 1024; // Simulated 15.5MB file
    const steps = 10;
    
    // Simulate steps of progress bar
    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800)); // 800ms delay per chunk
      const uploaded = Math.round((i / steps) * mockTotalBytes);
      if (onProgress) {
        onProgress(uploaded, mockTotalBytes);
      }
    }

    // Return the classic Rickroll video for visual play verification
    const mockVideoId = 'dQw4w9WgXcQ';
    return {
      externalVideoId: mockVideoId,
      videoUrl: `https://www.youtube.com/watch?v=${mockVideoId}`,
    };
  }
}
