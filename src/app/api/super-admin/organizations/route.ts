import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { SUBSCRIPTION_PLANS, SubscriptionPlanName } from '@/lib/plans';
import { z } from 'zod';

const updateOrgSchema = z.object({
  organizationId: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']).optional(),
  subscriptionPlan: z.enum(['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE']).optional()
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin role required.' }, { status: 403 });
    }

    const orgs = await db.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
            videos: true
          }
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1
        },
        customDomains: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ organizations: orgs });
  } catch (error) {
    console.error('[SUPER_ADMIN_ORGS] Error fetching orgs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Super Admin role required.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateOrgSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { organizationId, status, subscriptionPlan } = parsed.data;

    // Verify organization exists
    const org = await db.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const updated = await db.$transaction(async (tx) => {
      // Build update payloads
      const orgData: any = {};
      if (status) orgData.status = status;
      if (subscriptionPlan) orgData.subscriptionPlan = subscriptionPlan;

      // Update organization table
      const updatedOrg = await tx.organization.update({
        where: { id: organizationId },
        data: orgData
      });

      // Update active subscription plan parameters if changed
      if (subscriptionPlan) {
        const planConfig = SUBSCRIPTION_PLANS[subscriptionPlan as SubscriptionPlanName];
        
        // Update Subscription table
        await tx.subscription.updateMany({
          where: { organizationId, status: 'ACTIVE' },
          data: {
            plan: subscriptionPlan as SubscriptionPlanName,
            monthlyCredits: planConfig.monthlyCredits.video,
            storageLimit: planConfig.storageLimitGB
          }
        });

        // Update organization's CreditWallet allocations
        await tx.creditWallet.updateMany({
          where: { organizationId },
          data: {
            scriptCredits: planConfig.monthlyCredits.script,
            voiceCredits: planConfig.monthlyCredits.voice,
            videoCredits: planConfig.monthlyCredits.video,
            publishCredits: planConfig.monthlyCredits.publish,
            storageLimitGB: planConfig.storageLimitGB
          }
        });
      }

      // Log action
      await tx.activityLog.create({
        data: {
          actorId: session.user.id,
          actorRole: 'SUPER_ADMIN',
          action: 'ORGANIZATION_UPDATED_BY_SUPER_ADMIN',
          targetUserId: null,
          targetId: organizationId,
          metadata: {
            organizationName: org.name,
            updatedStatus: status || null,
            updatedPlan: subscriptionPlan || null
          }
        }
      });

      return updatedOrg;
    });

    return NextResponse.json({ success: true, organization: updated });

  } catch (error) {
    console.error('[SUPER_ADMIN_ORGS] Error updating org:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
