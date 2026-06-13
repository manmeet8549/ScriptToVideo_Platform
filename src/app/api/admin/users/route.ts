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
        phoneNumber: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
        creditWallet: true,
        _count: {
          select: {
            projects: true,
            videos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phoneNumber: u.phoneNumber || null,
      role: u.role,
      status: u.accountStatus,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      projectsCount: u._count.projects,
      videosCount: u._count.videos,
      credits: u.creditWallet ? {
        scriptCredits: u.creditWallet.scriptCredits,
        voiceCredits: u.creditWallet.voiceCredits,
        videoCredits: u.creditWallet.videoCredits,
        publishCredits: u.creditWallet.publishCredits,
      } : null,
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
    const { fullName, email, phoneNumber, accountStatus, creditAllocation } = await request.json();

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

    const newUser = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber?.trim() || null,
          passwordHash,
          temporaryPassword: tempPassword,
          mustChangePassword: true,
          role: 'USER',
          accountStatus: accountStatus || 'ACTIVE',
        },
      });

      // Create credit wallet
      await tx.creditWallet.create({
        data: {
          userId: u.id,
          scriptCredits: typeof creditAllocation?.scriptCredits === 'number' ? creditAllocation.scriptCredits : 10,
          voiceCredits: typeof creditAllocation?.voiceCredits === 'number' ? creditAllocation.voiceCredits : 10,
          videoCredits: typeof creditAllocation?.videoCredits === 'number' ? creditAllocation.videoCredits : 5,
          publishCredits: typeof creditAllocation?.publishCredits === 'number' ? creditAllocation.publishCredits : 5,
          storageLimitGB: 10.0,
          storageUsedGB: 0.0,
        },
      });

      return u;
    });

    // Log the action
    await logActivity(session.user.id, 'USER_CREATED', newUser.id, { email: newUser.email });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        accountStatus: newUser.accountStatus,
        createdAt: newUser.createdAt,
        temporaryPassword: tempPassword,
      },
    });
  } catch (error) {
    console.error('[ADMIN/USERS/POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
}
