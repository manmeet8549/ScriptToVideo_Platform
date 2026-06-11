import { Publisher } from './types';
import { YouTubePublisher } from './YouTubePublisher';
import { ZernioPublisher } from './ZernioPublisher';

export * from './types';
export * from './YouTubePublisher';
export * from './ZernioPublisher';

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
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'x':
      return new ZernioPublisher(platform, accessToken);
    default:
      throw new Error(`Unsupported publishing platform: ${platform}`);
  }
}
