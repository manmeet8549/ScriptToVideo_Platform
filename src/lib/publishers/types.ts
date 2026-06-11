export interface PublishOptions {
  title?: string;
  description?: string;
  tags?: string[];
  visibility?: 'public' | 'unlisted' | 'private';
  publishAt?: Date; // Optional scheduling

  // Platform specific fields
  caption?: string;    // Facebook, Instagram, LinkedIn
  tweetText?: string;  // X/Twitter
}

export interface PublishResult {
  externalVideoId: string;
  videoUrl: string;
}

export type ProgressCallback = (bytesUploaded: number, totalBytes: number) => void;

export interface Publisher {
  publish(
    videoR2Key: string,
    options: PublishOptions,
    onProgress?: ProgressCallback
  ): Promise<PublishResult>;
}
