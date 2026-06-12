import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generateTemporaryPassword, logActivity } from '@/lib/admin';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = await db.user.findMany({
      where: { role: 'USER', deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            projects: true,
            videos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format output to match requested fields
    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.accountStatus,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      projectsCount: u._count.projects,
      videosCount: u._count.videos,
    }));

    return NextResponse.json({ users: formatted });
  } catch (error) {
    console.error('[ADMIN/USERS/GET] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve users list.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { fullName, email } = await request.json();

    if (!fullName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: 'A user with this email address already exists.' }, { status: 400 });
    }

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await db.user.create({
      data: {
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        temporaryPassword: tempPassword,
        mustChangePassword: true,
        role: 'USER',
        accountStatus: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
      },
    });

    // Log the action
    await logActivity(session.user.id, 'USER_CREATED', newUser.id, { email: newUser.email });

    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        temporaryPassword: tempPassword,
      },
    });
  } catch (error) {
    console.error('[ADMIN/USERS/POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
}
