import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const domainSchema = z.object({
  domain: z.string().min(3, 'Domain must be at least 3 characters').regex(
    /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
    'Must be a valid domain name (e.g. video.mybrand.com)'
  ),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const domains = await db.customDomain.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ domains });
  } catch (error) {
    console.error('[DOMAINS_GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const body = await request.json();
    const parsed = domainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { domain } = parsed.data;

    // Check if domain is already registered
    const existing = await db.customDomain.findUnique({
      where: { domain },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This domain name is already registered in SCRIPT-AI.' },
        { status: 409 }
      );
    }

    const newDomain = await db.customDomain.create({
      data: {
        organizationId: session.user.organizationId,
        domain,
        verified: false,
      },
    });

    // Log Activity
    await db.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: role,
        action: 'DOMAIN_ADDED',
        targetId: newDomain.id,
        metadata: { domain },
      },
    });

    return NextResponse.json({ success: true, domain: newDomain });
  } catch (error) {
    console.error('[DOMAINS_POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let domainId = searchParams.get('id');

    if (!domainId) {
      const body = await request.json().catch(() => ({}));
      domainId = body.id;
    }

    if (!domainId) {
      return NextResponse.json({ error: 'Missing domain id' }, { status: 400 });
    }

    // Verify domain belongs to organization
    const existing = await db.customDomain.findUnique({
      where: { id: domainId },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    await db.customDomain.delete({
      where: { id: domainId },
    });

    // Log Activity
    await db.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: role,
        action: 'DOMAIN_REMOVED',
        metadata: { domain: existing.domain },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DOMAINS_DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
