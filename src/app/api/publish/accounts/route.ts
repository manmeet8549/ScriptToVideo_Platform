import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accounts = await db.socialAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        platform: true,
        email: true,
        channelName: true,
        connectedAt: true,
        isDefault: true,
        channelId: true,
        subscriberCount: true,
      },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('[PUBLISH_ACCOUNTS] Error listing accounts:', error);
    return NextResponse.json({ error: 'Failed to retrieve social accounts' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { accountId, action, channelName } = await request.json();

    if (!accountId || !action) {
      return NextResponse.json({ error: 'accountId and action are required' }, { status: 400 });
    }

    // Verify ownership
    const account = await db.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found or access denied.' }, { status: 404 });
    }

    if (action === 'rename') {
      if (!channelName || !channelName.trim()) {
        return NextResponse.json({ error: 'channelName is required for rename action' }, { status: 400 });
      }

      const updated = await db.socialAccount.update({
        where: { id: accountId },
        data: { channelName: channelName.trim() },
        select: {
          id: true,
          platform: true,
          email: true,
          channelName: true,
          connectedAt: true,
          isDefault: true,
          channelId: true,
          subscriberCount: true,
        }
      });

      return NextResponse.json({ success: true, account: updated });
    }

    if (action === 'setDefault') {
      // Run in transaction: unset default for all accounts on this platform for this user, then set default on the selected one
      await db.$transaction([
        db.socialAccount.updateMany({
          where: {
            userId: session.user.id,
            platform: account.platform,
          },
          data: { isDefault: false },
        }),
        db.socialAccount.update({
          where: { id: accountId },
          data: { isDefault: true },
        }),
      ]);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[PUBLISH_ACCOUNTS_PATCH] Error updating account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}
