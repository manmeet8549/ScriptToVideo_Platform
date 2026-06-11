import { Publisher, PublishOptions, PublishResult, ProgressCallback } from './types';
import { checkFileExists, generateSignedUrl } from '../r2';
import { createZernioPost } from '@/services/zernio';

export class ZernioPublisher implements Publisher {
  constructor(
    private platform: string,
    private zernioAccountId: string
  ) {}

  async publish(
    videoR2Key: string,
    options: PublishOptions,
    onProgress?: ProgressCallback
  ): Promise<PublishResult> {
    console.log(`[ZERNIO_PUBLISH_START] Starting Zernio publishing flow. Platform: ${this.platform}, Account ID: ${this.zernioAccountId}, Video key: ${videoR2Key}`);

    try {
      // 1. Pre-flight check: Verify file existence in R2
      const exists = await checkFileExists(videoR2Key);
      if (!exists) {
        throw new Error(`Video file with key "${videoR2Key}" does not exist in storage.`);
      }

      // 2. Pre-flight check: Verify video format
      const lowerKey = videoR2Key.toLowerCase();
      const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
      const hasValidExtension = validExtensions.some((ext) => lowerKey.endsWith(ext));
      if (!hasValidExtension) {
        throw new Error(`Invalid video format. Supported formats are: ${validExtensions.join(', ')}`);
      }

      // 3. Generate a signed URL for Zernio to pull the video (valid for 24 hours)
      const publicVideoUrl = await generateSignedUrl(videoR2Key, 86400);

      // 4. Determine post content
      let content = '';
      const platformLower = this.platform.toLowerCase();
      if (platformLower === 'twitter' || platformLower === 'x') {
        content = options.tweetText || options.description || options.title || '';
      } else {
        content = options.caption || options.description || options.title || '';
      }

      // Simulate progress callbacks for UI satisfaction
      if (onProgress) {
        onProgress(30, 100);
        await new Promise((resolve) => setTimeout(resolve, 300));
        onProgress(70, 100);
        await new Promise((resolve) => setTimeout(resolve, 300));
        onProgress(100, 100);
      }

      // 5. Create post on Zernio
      const post = await createZernioPost({
        platform: this.platform,
        accountId: this.zernioAccountId,
        content,
        videoUrl: publicVideoUrl,
        title: options.title,
        publishNow: true,
      });

      console.log(`[ZERNIO_PUBLISH_SUCCESS] Zernio post successfully created. Platform: ${this.platform}, Post ID: ${post._id}`);

      return {
        externalVideoId: post._id || '',
        videoUrl: '', // Actual watch URL will be populated when post.published webhook triggers
      };
    } catch (err) {
      console.error(`[ZERNIO_PUBLISH_FAILED] Zernio publishing failed. Platform: ${this.platform}, Error:`, err);
      throw err;
    }
  }
}
