import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { platform } = params;
  const platformLower = platform.toLowerCase();

  // For YouTube (Real Google OAuth 2.0 flow)
  if (platformLower === 'youtube') {
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Check if real credentials are configured
    const isMockMode = !client_id || !client_secret || process.env.MOCK_PUBLISH === 'true';

    if (!isMockMode) {
      const host = process.env.NEXTAUTH_URL || request.nextUrl.origin;
      const redirect_uri = `${host}/api/auth/youtube/callback`;
      const scope = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/youtube.readonly'
      ].join(' ');

      // Always show account chooser by specifying "select_account" in prompt
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
        `client_id=${client_id}` +
        `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&access_type=offline` +
        `&prompt=select_account%20consent`;

      return NextResponse.redirect(authUrl);
    }
  }

  // Fallback Mock Mode connection for all other platforms (and YouTube if developer keys are omitted)
  console.log(`[AUTH_${platform.toUpperCase()}] Running in MOCK OAuth Mode.`);
  const callbackUrl = new URL(`/api/auth/${platformLower}/callback`, request.nextUrl.origin);
  callbackUrl.searchParams.set('code', `mock-${platformLower}-code-123456`);
  return NextResponse.redirect(callbackUrl.toString());
}
