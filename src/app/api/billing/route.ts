import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { SUBSCRIPTION_PLANS, SubscriptionPlanName } from '@/lib/plans';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId! },
      select: { subscriptionPlan: true },
    });

    const subscription = await db.subscription.findFirst({
      where: { organizationId: session.user.organizationId! },
      orderBy: { startDate: 'desc' },
    });

    if (!org || !subscription) {
      return NextResponse.json({ error: 'Subscription details not found' }, { status: 404 });
    }

    const planLimits = SUBSCRIPTION_PLANS[org.subscriptionPlan as SubscriptionPlanName] || SUBSCRIPTION_PLANS.FREE;

    return NextResponse.json({
      subscription: {
        ...subscription,
        planName: planLimits.name,
        price: planLimits.price,
        features: planLimits.features,
        usersLimit: planLimits.usersLimit,
        editorsLimit: planLimits.editorsLimit,
      },
    });
  } catch (error) {
    console.error('[BILLING_GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { plan } = await request.json();

    if (!plan || !SUBSCRIPTION_PLANS[plan as SubscriptionPlanName]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const newPlanName = plan as SubscriptionPlanName;
    const planLimits = SUBSCRIPTION_PLANS[newPlanName];

    // Transaction to update organization plan, active subscription record, credit wallet quotas, and generate a paid invoice
    const result = await db.$transaction(async (tx) => {
      // 1. Update Organization
      const updatedOrg = await tx.organization.update({
        where: { id: session.user.organizationId! },
        data: { subscriptionPlan: newPlanName },
      });

      // 2. Create/Update Subscription
      const sub = await tx.subscription.create({
        data: {
          organizationId: session.user.organizationId!,
          plan: newPlanName,
          status: 'ACTIVE',
          monthlyCredits: planLimits.monthlyCredits.video,
          storageLimit: planLimits.storageLimitGB,
          startDate: new Date(),
        },
      });

      // 3. Update Credit Wallet of the organization's users or the admin's wallet (since CreditWallet is tied to user in this schema)
      const wallet = await tx.creditWallet.findFirst({
        where: { userId: session.user.id },
      });

      if (wallet) {
        await tx.creditWallet.update({
          where: { id: wallet.id },
          data: {
            scriptCredits: planLimits.monthlyCredits.script,
            voiceCredits: planLimits.monthlyCredits.voice,
            videoCredits: planLimits.monthlyCredits.video,
            publishCredits: planLimits.monthlyCredits.publish,
            storageLimitGB: planLimits.storageLimitGB,
          },
        });
      }

      // 4. Create Invoice for the transaction
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const invoice = await tx.invoice.create({
        data: {
          organizationId: session.user.organizationId!,
          amount: planLimits.price,
          currency: 'USD',
          status: planLimits.price === 0 ? 'VOID' : 'PAID',
          invoiceNumber,
          issuedAt: new Date(),
        },
      });

      // 5. Log Activity
      await tx.activityLog.create({
        data: {
          actorId: session.user.id,
          actorRole: role,
          action: 'ORGANIZATION_PLAN_UPGRADED',
          targetId: session.user.organizationId!,
          metadata: {
            newPlan: newPlanName,
            pricePaid: planLimits.price,
            invoiceId: invoice.id,
          },
        },
      });

      return { updatedOrg, sub, invoice };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${planLimits.name}`,
      organization: result.updatedOrg,
      subscription: result.sub,
      invoice: result.invoice,
    });
  } catch (error) {
    console.error('[BILLING_PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
