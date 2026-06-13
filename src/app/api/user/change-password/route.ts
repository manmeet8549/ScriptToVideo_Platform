import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // 1. Inputs validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All password fields are required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation password do not match.' }, { status: 400 });
    }

    // 2. Fetch the user's password hash from database
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // If OAuth user has no passwordHash set yet
    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Accounts connected via Google/OAuth do not have a password. Please sign in via Google.' }, { status: 400 });
    }

    // 3. Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    // 4. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 5. Update password in database
    await db.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    // 6. Log admin/user activity
    await logActivity(session.user.id, 'PASSWORD_CHANGED', session.user.id);

    return NextResponse.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('[USER/CHANGE-PASSWORD] Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while changing password.' }, { status: 500 });
  }
}
