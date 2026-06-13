import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getZernioConnectUrl, getOrCreateZernioProfileId } from '@/services/zernio';
import { validateZernioConfig } from '@/lib/env';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ platform: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { platform } = await props.params;
  if (!platform) {
    return NextResponse.json({ error: 'Platform parameter is required' }, { status: 400 });
  }

  const config = validateZernioConfig();
  if (!config.isConfigured) {
    return NextResponse.json(
      { error: 'Social publishing is temporarily unavailable. Please configure ZERNIO_API_KEY.' },
      { status: 400 }
    );
  }

  try {
    const profileId = await getOrCreateZernioProfileId();
    
    // Construct the callback URL pointing to our callback endpoint
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/social/callback`;

    console.log(`[ZERNIO_CONNECT] Generating connect URL for platform: ${platform}, profileId: ${profileId}, callback: ${callbackUrl}`);
    const authUrl = await getZernioConnectUrl(platform, profileId, callbackUrl);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error(`[ZERNIO_CONNECT] Error generating connection URL for ${platform}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate connection URL' },
      { status: 500 }
    );
  }
}
