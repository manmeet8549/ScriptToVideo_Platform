export interface PublishOptions {
  title: string;
  description: string;
  tags?: string[];
  visibility?: 'public' | 'unlisted' | 'private';
  publishAt?: Date; // Optional scheduling
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
