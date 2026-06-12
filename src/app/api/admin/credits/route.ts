import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ensureCreditWallet } from '@/lib/credits';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get all users who are CLIENTS or EDITORS
    const users = await db.user.findMany({
      where: {
        role: { in: ['USER', 'EDITOR'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        creditWallet: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Make sure they all have a credit wallet initialized
    const usersWithWallets = await Promise.all(
      users.map(async (u) => {
        if (!u.creditWallet) {
          const wallet = await ensureCreditWallet(u.id);
          return { ...u, creditWallet: wallet };
        }
        return u;
      })
    );

    // Fetch transactions
    const transactions = await db.creditTransaction.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 transactions
    });

    return NextResponse.json({
      users: usersWithWallets,
      transactions,
    });
  } catch (error) {
    console.error('[ADMIN/CREDITS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch credits dashboard data.' }, { status: 500 });
  }
}
