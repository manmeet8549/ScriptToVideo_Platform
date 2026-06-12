import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generateEditorKey, generateTemporaryPassword, logActivity } from '@/lib/admin';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const editors = await db.user.findMany({
      where: { role: 'EDITOR', deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
        editorProfile: {
          select: {
            editorKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = editors.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      role: e.role,
      status: e.accountStatus,
      createdAt: e.createdAt,
      lastLoginAt: e.lastLoginAt,
      editorKey: e.editorProfile?.editorKey || null,
    }));

    return NextResponse.json({ editors: formatted });
  } catch (error) {
    console.error('[ADMIN/EDITORS/GET] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve editors list.' }, { status: 500 });
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

    // Generate credentials & editor profile properties
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const editorKey = generateEditorKey();

    // Create the User and EditorProfile in a transaction
    const newEditor = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          passwordHash,
          temporaryPassword: tempPassword,
          mustChangePassword: true,
          role: 'EDITOR',
          accountStatus: 'ACTIVE',
        },
      });

      const profile = await tx.editorProfile.create({
        data: {
          userId: u.id,
          editorKey,
        },
      });

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        accountStatus: u.accountStatus,
        createdAt: u.createdAt,
        editorKey: profile.editorKey,
      };
    });

    // Log editor creation action
    await logActivity(session.user.id, 'EDITOR_CREATED', newEditor.id, {
      email: newEditor.email,
      editorKey: newEditor.editorKey,
    });

    return NextResponse.json({
      success: true,
      editor: {
        ...newEditor,
        temporaryPassword: tempPassword,
      },
    });
  } catch (error) {
    console.error('[ADMIN/EDITORS/POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create editor.' }, { status: 500 });
  }
}
