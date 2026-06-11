import { Publisher } from './types';
import { YouTubePublisher } from './YouTubePublisher';

export * from './types';
export * from './YouTubePublisher';

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
    default:
      throw new Error(`Unsupported publishing platform: ${platform}`);
  }
}
