import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing domain id' }, { status: 400 });
    }

    // Verify domain belongs to organization
    const existing = await db.customDomain.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Mark domain as verified (simulated CNAME/TXT validation success)
    const updatedDomain = await db.customDomain.update({
      where: { id },
      data: { verified: true },
    });

    // Also link it as shortcut in Organization.domain
    await db.organization.update({
      where: { id: session.user.organizationId },
      data: { domain: existing.domain },
    });

    // Log Activity
    await db.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: role,
        action: 'DOMAIN_VERIFIED',
        targetId: updatedDomain.id,
        metadata: { domain: existing.domain },
      },
    });

    return NextResponse.json({ success: true, domain: updatedDomain });
  } catch (error) {
    console.error('[DOMAINS_VERIFY] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
