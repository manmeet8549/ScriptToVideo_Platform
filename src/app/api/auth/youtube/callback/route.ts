import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appOrigin = request.nextUrl.origin;

  if (error || !code) {
    console.error('[YOUTUBE_CALLBACK] OAuth redirect returned error:', error);
    return NextResponse.redirect(`${appOrigin}/?tab=publish&error=${encodeURIComponent(error || 'Missing authorization code')}`);
  }

  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  const isMockMode = !client_id || !client_secret || code.startsWith('mock-') || process.env.MOCK_PUBLISH === 'true';

  try {
    let email = session.user.email || 'developer@thinknext.com';
    let channelName = 'ThinkNEXT Studio Channel';
    let accessToken = 'mock-access-token-987654321';
    let refreshToken = 'mock-refresh-token-123456789';
    let expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    if (!isMockMode) {
      // 1. Exchange authorization code for tokens
      const redirect_uri = `${appOrigin}/api/auth/youtube/callback`;
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

      // 2. Fetch User Profile Email
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        email = profile.email || email;
      }

      // 3. Fetch YouTube Channel Name
      const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (channelRes.ok) {
        const channelData = await channelRes.json();
        const firstChannel = channelData.items?.[0];
        if (firstChannel) {
          channelName = firstChannel.snippet?.title || channelName;
        }
      }
    }

    // Encrypt the tokens before storing in the database
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

    // 4. Save account to DB
    console.log(`[YOUTUBE_CALLBACK] Saving SocialAccount for user ${session.user.id} (${email}, Channel: ${channelName})`);
    
    // Check if a social account already exists for this user/platform
    await db.socialAccount.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: 'youtube',
        },
      },
      update: {
        email,
        channelName,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken || undefined, // don't wipe existing refresh token if not returned
        tokenExpiry: expiresAt,
        connectedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        platform: 'youtube',
        email,
        channelName,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry: expiresAt,
      },
    });

    return NextResponse.redirect(`${appOrigin}/?tab=publish&connected=youtube`);
  } catch (err) {
    console.error('[YOUTUBE_CALLBACK] Error handling OAuth callback:', err);
    return NextResponse.redirect(`${appOrigin}/?tab=publish&error=${encodeURIComponent(err instanceof Error ? err.message : 'Callback failed')}`);
  }
}
