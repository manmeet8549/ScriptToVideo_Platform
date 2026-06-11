import { Publisher, PublishOptions, PublishResult, ProgressCallback } from './types';

export class FacebookPublisher implements Publisher {
  async publish(
    videoR2Key: string,
    options: PublishOptions,
    onProgress?: ProgressCallback
  ): Promise<PublishResult> {
    console.log(`[FACEBOOK_PUBLISHER] Publishing video ${videoR2Key}`);

    // Simulate chunked upload progress
    const totalBytes = 1024 * 1024 * 8; // 8MB
    let bytesUploaded = 0;
    const chunkSize = 1024 * 1024 * 2; // 2MB chunks

    while (bytesUploaded < totalBytes) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      bytesUploaded = Math.min(bytesUploaded + chunkSize, totalBytes);
      if (onProgress) {
        onProgress(bytesUploaded, totalBytes);
      }
    }

    const mockId = Math.random().toString(36).substring(7).toUpperCase();
    return {
      externalVideoId: `fb-video-mock-${mockId}`,
      videoUrl: `https://www.facebook.com/mock-page/videos/${mockId}`,
    };
  }
}
