import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { platform } = params;
  const platformLower = platform.toLowerCase();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appOrigin = request.nextUrl.origin;

  if (error || !code) {
    console.error(`[AUTH_${platform.toUpperCase()}_CALLBACK] OAuth redirect returned error:`, error);
    return NextResponse.redirect(`${appOrigin}/?tab=publish&error=${encodeURIComponent(error || 'Missing authorization code')}`);
  }

  try {
    let email = session.user.email || 'creator@thinknext.com';
    let channelName = `${platform.charAt(0).toUpperCase() + platform.slice(1)} Channel`;
    let accessToken = `mock-${platformLower}-access-token`;
    let refreshToken: string | null = `mock-${platformLower}-refresh-token`;
    let expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    let channelId: string | null = null;
    let subscriberCount: string | null = null;

    const client_id = platformLower === 'youtube' ? process.env.GOOGLE_CLIENT_ID : null;
    const client_secret = platformLower === 'youtube' ? process.env.GOOGLE_CLIENT_SECRET : null;
    const isMockMode = !client_id || !client_secret || code.startsWith('mock-') || process.env.MOCK_PUBLISH === 'true';

    if (platformLower === 'youtube' && !isMockMode) {
      // Real YouTube token exchange and details retrieval
      const redirect_uri = `${appOrigin}/api/publish/auth/youtube/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: client_id!,
          client_secret: client_secret!,
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Token exchange failed: ${tokenRes.status} - ${errText}`);
      }

      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || null;
      expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

      // Fetch user profile email
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        email = profile.email || email;
      }

      // Fetch YouTube channel name, channelId, and subscriberCount
      const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (channelRes.ok) {
        const channelData = await channelRes.json();
        const firstChannel = channelData.items?.[0];
        if (firstChannel) {
          channelName = firstChannel.snippet?.title || channelName;
          channelId = firstChannel.id || null;
          subscriberCount = firstChannel.statistics?.subscriberCount || null;
        }
      }
    } else {
      // Mock Mode Account Connection (reads custom query params from mock consent page first)
      const queryName = searchParams.get('channelName');
      const queryEmail = searchParams.get('email');
      
      if (queryName && queryName !== 'custom') {
        channelName = queryName;
      } else {
        const randomSuffix = Math.random().toString(36).substring(7).toUpperCase();
        channelName = `${platform.charAt(0).toUpperCase() + platform.slice(1)} Channel ${randomSuffix}`;
      }
      
      if (queryEmail) {
        email = queryEmail;
      } else {
        email = `${platformLower}-creator@thinknext.com`;
      }

      if (platformLower === 'youtube') {
        channelId = `UC-mock-yt-${Math.random().toString(36).substring(7)}`;
        subscriberCount = '12500';
      }
    }

    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

    console.log(`[AUTH_${platform.toUpperCase()}_CALLBACK] Connecting SocialAccount for user ${session.user.id} (${email}, Channel: ${channelName})`);

    // Match by userId, platform, and channelName programmatically to support multiple connected accounts
    const existing = await db.socialAccount.findFirst({
      where: {
        userId: session.user.id,
        platform: platformLower,
        channelName,
      },
    });

    if (existing) {
      await db.socialAccount.update({
        where: { id: existing.id },
        data: {
          email,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken || undefined,
          tokenExpiry: expiresAt,
          connectedAt: new Date(),
          channelId,
          subscriberCount,
        },
      });
    } else {
      // Check if this is the first account for this platform to set as default
      const siblingCount = await db.socialAccount.count({
        where: {
          userId: session.user.id,
          platform: platformLower,
        },
      });
      const isDefault = siblingCount === 0;

      await db.socialAccount.create({
        data: {
          userId: session.user.id,
          platform: platformLower,
          email,
          channelName,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry: expiresAt,
          isDefault,
          channelId,
          subscriberCount,
        },
      });
    }

    return NextResponse.redirect(`${appOrigin}/?tab=publish&connected=${platformLower}`);
  } catch (err) {
    console.error(`[AUTH_${platform.toUpperCase()}_CALLBACK] Error handling OAuth callback:`, err);
    return NextResponse.redirect(`${appOrigin}/?tab=publish&error=${encodeURIComponent(err instanceof Error ? err.message : 'Callback failed')}`);
  }
}
