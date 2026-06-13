import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { calculateStorageUsed, ensureCreditWallet } from '@/lib/credits';

export async function GET() {
  const session = await auth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!session?.user?.id || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Fetch all users with user role
    const users = await db.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        name: true,
        email: true,
        creditWallet: true,
      },
    });

    // Update their storage used in case it's out of sync
    const consumers = await Promise.all(
      users.map(async (u) => {
        let wallet = u.creditWallet;
        if (!wallet) {
          wallet = await ensureCreditWallet(u.id);
        } else {
          // Recalculate storage used to be absolutely fresh
          const freshStorage = await calculateStorageUsed(u.id);
          wallet.storageUsedGB = freshStorage;
        }

        return {
          id: u.id,
          name: u.name || 'Workspace User',
          email: u.email,
          storageUsedGB: wallet.storageUsedGB,
          storageLimitGB: wallet.storageLimitGB,
        };
      })
    );

    // Sort by usage descending
    consumers.sort((a, b) => b.storageUsedGB - a.storageUsedGB);

    const totalUsedGB = consumers.reduce((acc, c) => acc + c.storageUsedGB, 0);
    const totalLimitGB = consumers.reduce((acc, c) => acc + c.storageLimitGB, 0);
    const remainingGB = Math.max(0, totalLimitGB - totalUsedGB);

    return NextResponse.json({
      totalUsedGB: parseFloat(totalUsedGB.toFixed(2)),
      totalLimitGB: parseFloat(totalLimitGB.toFixed(2)),
      remainingGB: parseFloat(remainingGB.toFixed(2)),
      consumers,
    });
  } catch (error) {
    console.error('[ADMIN/STORAGE] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch storage metrics.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!session?.user?.id || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, storageLimitGB } = await req.json();

    if (!userId || storageLimitGB === undefined || storageLimitGB <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    await ensureCreditWallet(userId);

    const updated = await db.creditWallet.update({
      where: { userId },
      data: {
        storageLimitGB: parseFloat(storageLimitGB),
      },
    });

    // Notify user
    await db.notification.create({
      data: {
        userId,
        title: 'Storage Limit Updated',
        message: `An administrator updated your storage limit to ${storageLimitGB} GB.`,
        type: 'SYSTEM',
      },
    });

    return NextResponse.json({ success: true, wallet: updated });
  } catch (error) {
    console.error('[ADMIN/STORAGE/POST] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
