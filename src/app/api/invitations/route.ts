import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { Role } from '@prisma/client';

const invitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ORG_ADMIN', 'USER', 'EDITOR', 'ADMIN']),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const invitations = await db.teamInvitation.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('[INVITATIONS_GET] Error:', error);
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
    const parsed = invitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, role: inviteRole } = parsed.data;

    // Check if target user is already in the organization
    const existingMember = await db.user.findFirst({
      where: {
        email,
        organizationId: session.user.organizationId,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'A user with this email address is already a member of your organization.' },
        { status: 409 }
      );
    }

    // Generate token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await db.teamInvitation.create({
      data: {
        organizationId: session.user.organizationId,
        email,
        role: inviteRole as Role,
        token,
        expiresAt,
      },
    });

    // Log Activity
    await db.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: role,
        action: 'INVITATION_CREATED',
        targetId: invitation.id,
        metadata: { email, role: inviteRole },
      },
    });

    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error('[INVITATIONS_POST] Error:', error);
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
    let inviteId = searchParams.get('id');

    if (!inviteId) {
      const body = await request.json().catch(() => ({}));
      inviteId = body.id;
    }

    if (!inviteId) {
      return NextResponse.json({ error: 'Missing invitation id' }, { status: 400 });
    }

    // Verify invitation belongs to organization
    const invitation = await db.teamInvitation.findUnique({
      where: { id: inviteId },
    });

    if (!invitation || invitation.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    await db.teamInvitation.delete({
      where: { id: inviteId },
    });

    // Log Activity
    await db.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: role,
        action: 'INVITATION_REVOKED',
        metadata: { email: invitation.email },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[INVITATIONS_DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
