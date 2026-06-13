import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { SUBSCRIPTION_PLANS, SubscriptionPlanName } from '@/lib/plans';
import { z } from 'zod';

const onboardSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  orgSlug: z.string().min(2, 'Subdomain slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE']),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  invites: z.array(z.string().email('Invalid email address')).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = onboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      orgName,
      orgSlug,
      plan,
      primaryColor,
      secondaryColor,
      adminName,
      adminEmail,
      adminPassword,
      invites
    } = parsed.data;

    // 1. Check if organization slug is taken
    const existingOrg = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (existingOrg) {
      return NextResponse.json({ error: 'This subdomain slug is already in use.' }, { status: 409 });
    }

    // 2. Check if admin email is taken
    const existingUser = await db.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 409 });
    }

    // 3. Hash admin password
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const planLimit = SUBSCRIPTION_PLANS[plan as SubscriptionPlanName];

    // 4. Execute transaction to create SaaS tenant stack
    const result = await db.$transaction(async (tx) => {
      // A. Create Organization
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          logo: null,
          primaryColor: primaryColor || '#000000',
          secondaryColor: secondaryColor || '#ffffff',
          subscriptionPlan: plan as SubscriptionPlanName,
          status: 'ACTIVE'
        }
      });

      // B. Create Subscription
      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: plan as SubscriptionPlanName,
          status: 'ACTIVE',
          monthlyCredits: planLimit.monthlyCredits.video,
          storageLimit: planLimit.storageLimitGB
        }
      });

      // C. Create Admin User
      const user = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: 'ORG_ADMIN',
          organizationId: org.id,
          accountStatus: 'ACTIVE'
        }
      });

      // D. Create Credit Wallet
      await tx.creditWallet.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          scriptCredits: planLimit.monthlyCredits.script,
          voiceCredits: planLimit.monthlyCredits.voice,
          videoCredits: planLimit.monthlyCredits.video,
          publishCredits: planLimit.monthlyCredits.publish,
          storageLimitGB: planLimit.storageLimitGB,
          storageUsedGB: 0.0
        }
      });

      // E. Generate Team Invitations if any
      if (invites && invites.length > 0) {
        for (const email of invites) {
          await tx.teamInvitation.create({
            data: {
              organizationId: org.id,
              email,
              role: 'USER',
              token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
            }
          });
        }
      }

      // F. Log Activity
      await tx.activityLog.create({
        data: {
          actorId: user.id,
          actorRole: 'ORG_ADMIN',
          action: 'ORGANIZATION_ONBOARDED',
          targetUserId: user.id,
          targetId: org.id,
          metadata: {
            organizationName: org.name,
            subdomainSlug: org.slug,
            subscriptionPlan: plan,
            invitesCount: invites?.length || 0
          }
        }
      });

      // G. Send Welcome Notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Organization Setup Complete',
          message: `Welcome to SCRIPT-AI! Your organization "${orgName}" has been successfully set up on the ${planLimit.name}.`,
          type: 'SYSTEM'
        }
      });

      return { org, user };
    });

    return NextResponse.json({
      success: true,
      organizationId: result.org.id,
      userId: result.user.id,
      slug: result.org.slug
    }, { status: 201 });

  } catch (error) {
    console.error('[ONBOARDING_API] Error:', error);
    return NextResponse.json({ error: 'Internal server error. Please try again.' }, { status: 500 });
  }
}
