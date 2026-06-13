import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { validateZernioConfig } from '@/lib/env';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const whereClause: any = {};
    if (session.user.organizationId) {
      whereClause.organizationId = session.user.organizationId;
    } else {
      whereClause.userId = session.user.id;
    }

    const accounts = await db.socialAccount.findMany({
      where: whereClause,
      select: {
        id: true,
        platform: true,
        email: true,
        channelName: true,
        connectedAt: true,
        isDefault: true,
        channelId: true,
        subscriberCount: true,
        zernioAccountId: true,
        accountHandle: true,
      },
    });

    return NextResponse.json({ 
      accounts,
      zernioConfigured: validateZernioConfig().isConfigured
    });
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
    const whereClause: any = { id: accountId };
    if (session.user.organizationId) {
      whereClause.organizationId = session.user.organizationId;
    } else {
      whereClause.userId = session.user.id;
    }

    const account = await db.socialAccount.findFirst({
      where: whereClause,
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
          zernioAccountId: true,
          accountHandle: true,
        }
      });

      return NextResponse.json({ success: true, account: updated });
    }

    if (action === 'setDefault') {
      // Run in transaction: unset default for all accounts on this platform for this organization/user, then set default on the selected one
      await db.$transaction([
        db.socialAccount.updateMany({
          where: session.user.organizationId
            ? { organizationId: session.user.organizationId, platform: account.platform }
            : { userId: session.user.id, platform: account.platform },
          data: { isDefault: false },
        }),
        db.socialAccount.update({
          where: { id: accountId },
          data: { isDefault: true },
        }),
      ]);

      return NextResponse.json({ success: true });
    }

    if (action === 'disconnect' || action === 'delete') {
      await db.socialAccount.delete({
        where: { id: accountId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[PUBLISH_ACCOUNTS_PATCH] Error updating account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

