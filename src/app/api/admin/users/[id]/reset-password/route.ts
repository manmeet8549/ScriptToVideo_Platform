import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generateTemporaryPassword, logActivity } from '@/lib/admin';
import bcrypt from 'bcryptjs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
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

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await db.user.update({
      where: { id },
      data: {
        passwordHash,
        temporaryPassword: tempPassword,
        mustChangePassword: true,
      },
    });

    // Log the password reset action
    await logActivity(session.user.id, 'PASSWORD_RESET', id, {
      email: existingUser.email,
    });

    return NextResponse.json({
      success: true,
      temporaryPassword: tempPassword,
      message: 'Password reset successful. Temporary password generated.',
    });
  } catch (error) {
    console.error(`[ADMIN/USER/RESET_PASSWORD] Error for ID ${id}:`, error);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}
