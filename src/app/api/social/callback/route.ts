import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const session = await auth();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';

  if (!session?.user?.id) {
    console.error('[ZERNIO_CALLBACK] Unauthorized access attempt.');
    return NextResponse.redirect(new URL('/?error=unauthorized', baseUrl));
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const connected = searchParams.get('connected');
  const profileId = searchParams.get('profileId');
  const accountId = searchParams.get('accountId');
  const username = searchParams.get('username');

  console.log('[ZERNIO_CALLBACK] Received callback:', {
    connected,
    profileId,
    accountId,
    username,
    userId,
  });

  if (!connected || !accountId) {
    console.error('[ZERNIO_CALLBACK] Missing required Zernio query parameters.');
    return NextResponse.redirect(new URL('/?tab=publish&error=missing_params', baseUrl));
  }

  try {
    const platform = connected.toLowerCase();

    // Check if the social account already exists for this user
    const existing = await db.socialAccount.findFirst({
      where: {
        userId,
        platform,
        zernioAccountId: accountId,
      },
    });

    // Check if user has any other accounts for this platform
    const platformAccountsCount = await db.socialAccount.count({
      where: {
        userId,
        platform,
      },
    });

    const isDefault = platformAccountsCount === 0;

    const accountData = {
      userId,
      platform,
      channelName: username || `${connected} Account`,
      accountHandle: username || null,
      zernioAccountId: accountId,
      accessToken: encrypt(accountId), // encrypt to maintain schema decryption compatibility
      isDefault,
      organizationId: session.user.organizationId,
    };

    if (existing) {
      await db.socialAccount.update({
        where: { id: existing.id },
        data: accountData,
      });
      console.log(`[ZERNIO_CALLBACK] Successfully updated existing account: ${accountId}`);
    } else {
      await db.socialAccount.create({
        data: accountData,
      });
      console.log(`[ZERNIO_CALLBACK] Successfully created new account: ${accountId}`);
    }

    return NextResponse.redirect(new URL(`/?tab=publish&connected=${platform}`, baseUrl));
  } catch (error) {
    console.error('[ZERNIO_CALLBACK] Database operation failed:', error);
    return NextResponse.redirect(new URL('/?tab=publish&error=db_error', baseUrl));
  }
}
