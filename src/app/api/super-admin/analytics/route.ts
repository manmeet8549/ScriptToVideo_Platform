import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { SUBSCRIPTION_PLANS, SubscriptionPlanName } from '@/lib/plans';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin role required.' }, { status: 403 });
    }

    // 1. Gather global metric aggregates
    const [
      totalOrgs,
      totalUsers,
      totalEditors,
      totalVideos,
      totalPublished,
      wallets
    ] = await db.$transaction([
      db.organization.count(),
      db.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      db.user.count({ where: { role: 'EDITOR' } }),
      db.video.count(),
      db.publishedVideo.count({ where: { status: 'Published' } }),
      db.creditWallet.findMany({ select: { storageUsedGB: true } })
    ]);

    const storageConsumed = wallets.reduce((acc, curr) => acc + (curr.storageUsedGB || 0), 0);

    // 2. Count subscription plans distribution
    const orgs = await db.organization.findMany({
      select: { subscriptionPlan: true }
    });

    const activeSubscriptions: Record<string, number> = {
      FREE: 0,
      STARTER: 0,
      PRO: 0,
      BUSINESS: 0,
      ENTERPRISE: 0
    };

    orgs.forEach(o => {
      if (activeSubscriptions[o.subscriptionPlan] !== undefined) {
        activeSubscriptions[o.subscriptionPlan]++;
      }
    });

    // 3. Calculate simulated revenue (MRC - Monthly Recurring Contract value)
    let simulatedRevenue = 0;
    orgs.forEach(o => {
      const planConfig = SUBSCRIPTION_PLANS[o.subscriptionPlan as SubscriptionPlanName];
      if (planConfig) {
        simulatedRevenue += planConfig.price;
      }
    });

    return NextResponse.json({
      metrics: {
        organizations: totalOrgs,
        users: totalUsers,
        editors: totalEditors,
        videosGenerated: totalVideos,
        videosPublished: totalPublished,
        storageConsumedGB: parseFloat(storageConsumed.toFixed(2)),
        monthlyRevenue: simulatedRevenue
      },
      subscriptions: activeSubscriptions
    });

  } catch (error) {
    console.error('[SUPER_ADMIN_ANALYTICS] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
