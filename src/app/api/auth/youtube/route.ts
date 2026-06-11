import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  // Trigger Mock Connection automatically if client credentials are not defined
  const isMockMode = !client_id || !client_secret || process.env.MOCK_PUBLISH === 'true';

  if (isMockMode) {
    console.log('[YOUTUBE_AUTH] Google API keys are not configured. Running in MOCK OAuth Mode.');
    const callbackUrl = new URL('/api/auth/youtube/callback', request.nextUrl.origin);
    callbackUrl.searchParams.set('code', 'mock-developer-code-123456');
    return NextResponse.redirect(callbackUrl.toString());
  }

  const host = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const redirect_uri = `${host}/api/auth/youtube/callback`;
  const scope = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/youtube.readonly'
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${client_id}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  return NextResponse.redirect(authUrl);
}
