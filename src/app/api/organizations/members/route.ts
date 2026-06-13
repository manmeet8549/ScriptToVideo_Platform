import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const members = await db.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('[MEMBERS_GET] Error:', error);
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
    const { userId, role: newRole } = await request.json();

    if (!userId || !newRole) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    // Validate role is allowed
    const allowedRoles: Role[] = ['ORG_ADMIN', 'USER', 'EDITOR', 'ADMIN'];
    if (!allowedRoles.includes(newRole as Role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Verify target user is in the same organization
    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'User not found in this organization' }, { status: 404 });
    }

    // Prevent demoting last ORG_ADMIN
    if (targetUser.role === 'ORG_ADMIN' && newRole !== 'ORG_ADMIN') {
      const orgAdminsCount = await db.user.count({
        where: {
          organizationId: session.user.organizationId,
          role: 'ORG_ADMIN',
        },
      });
      if (orgAdminsCount <= 1) {
        return NextResponse.json({ error: 'Cannot demote the last Organization Admin.' }, { status: 400 });
      }
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { role: newRole as Role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: role,
        action: 'MEMBER_ROLE_UPDATED',
        targetUserId: userId,
        metadata: {
          oldRole: targetUser.role,
          newRole: newRole,
        },
      },
    });

    return NextResponse.json({ success: true, member: updatedUser });
  } catch (error) {
    console.error('[MEMBERS_PATCH] Error:', error);
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
    let userId = searchParams.get('userId');

    if (!userId) {
      const body = await request.json().catch(() => ({}));
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Verify target user is in the same organization
    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'User not found in this organization' }, { status: 404 });
    }

    // Prevent removing oneself
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from the organization' }, { status: 400 });
    }

    // Prevent removing the last ORG_ADMIN
    if (targetUser.role === 'ORG_ADMIN') {
      const orgAdminsCount = await db.user.count({
        where: {
          organizationId: session.user.organizationId,
          role: 'ORG_ADMIN',
        },
      });
      if (orgAdminsCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last Organization Admin.' }, { status: 400 });
      }
    }

    // Disconnect user from organization (set organizationId to null)
    await db.user.update({
      where: { id: userId },
      data: { organizationId: null },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: role,
        action: 'MEMBER_REMOVED',
        targetUserId: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MEMBERS_DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
