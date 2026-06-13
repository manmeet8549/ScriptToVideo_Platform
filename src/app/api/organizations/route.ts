import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const orgUpdateSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').optional(),
  slug: z.string().min(2, 'Subdomain slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens').optional(),
  logo: z.string().url('Invalid logo URL').nullable().or(z.string().length(0)).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  approvalRequired: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      include: {
        subscriptions: {
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        customDomains: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error('[ORGANIZATIONS_GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Enforce role permission: ORG_ADMIN or SUPER_ADMIN only
  const role = session.user.role;
  if (role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = orgUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check slug uniqueness if it is being updated
    if (data.slug) {
      const existingOrg = await db.organization.findFirst({
        where: {
          slug: data.slug,
          id: { not: session.user.organizationId },
        },
      });

      if (existingOrg) {
        return NextResponse.json(
          { error: 'Subdomain slug is already in use by another organization.' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.logo !== undefined) updateData.logo = data.logo || null;
    if (data.primaryColor !== undefined) updateData.primaryColor = data.primaryColor;
    if (data.secondaryColor !== undefined) updateData.secondaryColor = data.secondaryColor;
    if (data.approvalRequired !== undefined) updateData.approvalRequired = data.approvalRequired;

    const updatedOrg = await db.organization.update({
      where: { id: session.user.organizationId },
      data: updateData,
    });

    // Log action
    await db.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: role,
        action: 'ORGANIZATION_UPDATED',
        targetId: updatedOrg.id,
        metadata: {
          updatedFields: Object.keys(updateData),
        },
      },
    });

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
    });
  } catch (error) {
    console.error('[ORGANIZATIONS_PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
