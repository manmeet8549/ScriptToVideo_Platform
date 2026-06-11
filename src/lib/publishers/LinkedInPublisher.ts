import { Publisher, PublishOptions, PublishResult, ProgressCallback } from './types';

export class LinkedInPublisher implements Publisher {
  async publish(
    videoR2Key: string,
    options: PublishOptions,
    onProgress?: ProgressCallback
  ): Promise<PublishResult> {
    console.log(`[LINKEDIN_PUBLISHER] Publishing video ${videoR2Key}`);
    
    // Simulate chunked upload progress
    const totalBytes = 1024 * 1024 * 6; // 6MB
    let bytesUploaded = 0;
    const chunkSize = 1024 * 1024 * 1.5; // 1.5MB chunks

    while (bytesUploaded < totalBytes) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      bytesUploaded = Math.min(bytesUploaded + chunkSize, totalBytes);
      if (onProgress) {
        onProgress(bytesUploaded, totalBytes);
      }
    }

    const mockId = Math.random().toString(36).substring(7).toUpperCase();
    return {
      externalVideoId: `urn:li:share:mock-${mockId}`,
      videoUrl: `https://www.linkedin.com/feed/update/urn:li:share:mock-${mockId}`,
    };
  }
}
