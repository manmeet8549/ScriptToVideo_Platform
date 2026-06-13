import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/admin';
import { Role, AccountStatus } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!session?.user?.id || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  try {
    const user = await db.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const [projects, videos, publishingActivity] = await Promise.all([
      db.project.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
      }),
      db.video.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
      }),
      db.publishedVideo.findMany({
        where: { userId: id },
        include: {
          socialAccount: {
            select: {
              channelName: true,
              accountHandle: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Sum storage sizes
    const storageUsage = videos.reduce((acc, v) => acc + (v.fileSize || 0), 0);

    return NextResponse.json({
      user,
      projects,
      videos,
      publishingActivity,
      storageUsageBytes: storageUsage,
    });
  } catch (error) {
    console.error(`[ADMIN/USER/GET] Error for ID ${id}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve user details.' }, { status: 500 });
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!session?.user?.id || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await _request.json();
    const { role, accountStatus } = body;

    const existingUser = await db.user.findFirst({
      where: { id, deletedAt: null },
      select: { accountStatus: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const updateData: { role?: Role; accountStatus?: AccountStatus } = {};
    if (role) updateData.role = role as Role;
    if (accountStatus) updateData.accountStatus = accountStatus as AccountStatus;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
    });

    // Handle activity logging for status changes
    if (accountStatus && accountStatus !== existingUser.accountStatus) {
      let action = '';
      if (accountStatus === 'PAUSED') action = 'ACCOUNT_PAUSED';
      else if (accountStatus === 'ACTIVE') action = 'ACCOUNT_RESUMED';
      else if (accountStatus === 'STOPPED') action = 'ACCOUNT_STOPPED';

      if (action) {
        await logActivity(session.user.id, action, id, {
          previousStatus: existingUser.accountStatus,
          newStatus: accountStatus,
        });
      }
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(`[ADMIN/USER/PATCH] Error for ID ${id}:`, error);
    return NextResponse.json({ error: 'Failed to update user details.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!session?.user?.id || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  try {
    const existingUser = await db.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Perform soft delete
    const deletedUser = await db.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
        accountStatus: 'DELETED',
      },
    });

    // Log deletion activity
    await logActivity(session.user.id, 'ACCOUNT_DELETED', id, {
      email: existingUser.email,
    });

    return NextResponse.json({ success: true, message: 'User account soft deleted successfully.', user: deletedUser });
  } catch (error) {
    console.error(`[ADMIN/USER/DELETE] Error for ID ${id}:`, error);
    return NextResponse.json({ error: 'Failed to delete user account.' }, { status: 500 });
  }
}
