import { Publisher, PublishOptions, PublishResult, ProgressCallback } from './types';

export class InstagramPublisher implements Publisher {
  async publish(
    videoR2Key: string,
    options: PublishOptions,
    onProgress?: ProgressCallback
  ): Promise<PublishResult> {
    console.log(`[INSTAGRAM_PUBLISHER] Publishing reel ${videoR2Key}`);

    // Simulate chunked upload progress
    const totalBytes = 1024 * 1024 * 5; // 5MB
    let bytesUploaded = 0;
    const chunkSize = 1024 * 1024 * 1; // 1MB chunks

    while (bytesUploaded < totalBytes) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      bytesUploaded = Math.min(bytesUploaded + chunkSize, totalBytes);
      if (onProgress) {
        onProgress(bytesUploaded, totalBytes);
      }
    }

    const mockId = Math.random().toString(36).substring(7).toUpperCase();
    return {
      externalVideoId: `ig-reel-mock-${mockId}`,
      videoUrl: `https://www.instagram.com/reel/${mockId}`,
    };
  }
}
