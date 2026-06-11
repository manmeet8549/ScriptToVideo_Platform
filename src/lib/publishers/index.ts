import { Publisher } from './types';
import { YouTubePublisher } from './YouTubePublisher';
import { LinkedInPublisher } from './LinkedInPublisher';
import { FacebookPublisher } from './FacebookPublisher';
import { InstagramPublisher } from './InstagramPublisher';
import { TwitterPublisher } from './TwitterPublisher';

export * from './types';
export * from './YouTubePublisher';
export * from './LinkedInPublisher';
export * from './FacebookPublisher';
export * from './InstagramPublisher';
export * from './TwitterPublisher';

/**
 * Factory to return a configured Publisher instance for the requested platform.
 */
export function getPublisher(
  platform: string,
  accessToken: string,
  refreshToken: string | null,
  tokenExpiry: Date | null,
  onTokenRefreshed?: (newAccessToken: string, newExpiry: Date) => Promise<void>
): Publisher {
  switch (platform.toLowerCase()) {
    case 'youtube':
      return new YouTubePublisher(accessToken, refreshToken, tokenExpiry, onTokenRefreshed);
    case 'linkedin':
      return new LinkedInPublisher();
    case 'facebook':
      return new FacebookPublisher();
    case 'instagram':
      return new InstagramPublisher();
    case 'twitter':
      return new TwitterPublisher();
    default:
      throw new Error(`Unsupported publishing platform: ${platform}`);
  }
}
