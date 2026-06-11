import { getZernioClient } from '@/lib/zernio';

export type ZernioPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter';

/**
 * Maps application platform names to Zernio platform names.
 */
export function mapPlatform(platform: string): ZernioPlatform {
  const p = platform.toLowerCase();
  if (p === 'linkedin') return 'linkedin';
  if (p === 'facebook') return 'facebook';
  if (p === 'instagram') return 'instagram';
  if (p === 'twitter' || p === 'x') return 'twitter';
  throw new Error(`Unsupported Zernio platform: ${platform}`);
}

/**
 * Generates Zernio OAuth connection URL.
 */
export async function getZernioConnectUrl(
  platform: string,
  profileId: string,
  redirectUrl: string
): Promise<string> {
  const zernioPlatform = mapPlatform(platform);
  const client = getZernioClient();
  const response = await client.connect.getConnectUrl({
    path: { platform: zernioPlatform },
    query: {
      profileId,
      redirect_url: redirectUrl,
    },
  });

  if (!response.data?.authUrl) {
    throw new Error(`Failed to generate connect URL for ${platform}: ${response.error || 'Unknown error'}`);
  }

  return response.data.authUrl;
}

/**
 * Fetches Zernio profiles to find the default profile or first profile.
 */
export async function getOrCreateZernioProfileId(): Promise<string> {
  const client = getZernioClient();
  const response = await client.profiles.listProfiles();
  const profiles = response.data?.profiles || [];

  if (profiles.length > 0) {
    const defaultProfile = (profiles as Array<{ isDefault?: boolean; _id?: string }>).find((p) => p.isDefault) || profiles[0];
    if (defaultProfile?._id) {
      return defaultProfile._id;
    }
  }

  // Create a default profile if none exists
  const createResponse = await client.profiles.createProfile({
    body: {
      name: 'Default',
    },
  });

  if (!createResponse.data?.profile?._id) {
    throw new Error('Failed to find or create a Zernio profile.');
  }

  return createResponse.data.profile._id;
}

/**
 * Creates a unified post with R2 video.
 */
export async function createZernioPost(params: {
  platform: string;
  accountId: string;
  content: string;
  videoUrl: string;
  publishNow?: boolean;
  title?: string;
}) {
  const zernioPlatform = mapPlatform(params.platform);
  const client = getZernioClient();
  
  const body = {
    title: params.title || 'Published Video',
    content: params.content,
    mediaItems: [
      {
        type: 'video' as const,
        url: params.videoUrl,
      },
    ],
    platforms: [
      {
        platform: zernioPlatform,
        accountId: params.accountId,
      },
    ],
    publishNow: params.publishNow !== false, // default to true
  };

  const response = await client.posts.createPost({ body });

  if (!response.data?.post?._id) {
    throw new Error(`Failed to create post on Zernio: ${JSON.stringify(response.error || response)}`);
  }

  return response.data.post;
}
