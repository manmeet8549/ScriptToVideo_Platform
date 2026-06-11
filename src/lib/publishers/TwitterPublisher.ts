import { Publisher, PublishOptions, PublishResult, ProgressCallback } from './types';

export class TwitterPublisher implements Publisher {
  async publish(
    videoR2Key: string,
    options: PublishOptions,
    onProgress?: ProgressCallback
  ): Promise<PublishResult> {
    console.log(`[TWITTER_PUBLISHER] Publishing tweet with video ${videoR2Key}`);

    // Simulate chunked upload progress
    const totalBytes = 1024 * 1024 * 4; // 4MB
    let bytesUploaded = 0;
    const chunkSize = 1024 * 1024 * 1; // 1MB chunks

    while (bytesUploaded < totalBytes) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      bytesUploaded = Math.min(bytesUploaded + chunkSize, totalBytes);
      if (onProgress) {
        onProgress(bytesUploaded, totalBytes);
      }
    }

    const mockId = Math.random().toString(36).substring(7).toUpperCase();
    return {
      externalVideoId: `x-status-mock-${mockId}`,
      videoUrl: `https://x.com/mock-user/status/${mockId}`,
    };
  }
}
