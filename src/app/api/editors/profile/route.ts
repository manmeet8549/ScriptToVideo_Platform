import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generateEditorKey } from '@/lib/admin';
import { EditorAvailability } from '@prisma/client';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure role is EDITOR or ADMIN
  if (session.user.role !== 'EDITOR' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    let profile = await db.editorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Fallback: if profile does not exist (e.g. legacy/manually created editor), create it
    if (!profile) {
      const editorKey = generateEditorKey();
      profile = await db.editorProfile.create({
        data: {
          userId: session.user.id,
          editorKey,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[EDITORS/PROFILE/GET] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve profile details.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure role is EDITOR or ADMIN
  if (session.user.role !== 'EDITOR' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { displayName, bio, skills, availability } = await request.json();

    // Validate availability if provided
    if (availability && !Object.values(EditorAvailability).includes(availability)) {
      return NextResponse.json({ error: 'Invalid availability status.' }, { status: 400 });
    }

    // Prepare update data
    const updateData: {
      displayName?: string | null;
      bio?: string | null;
      skills?: string[];
      availability?: EditorAvailability;
    } = {};

    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (skills !== undefined) {
      // Ensure skills is a valid array of strings
      if (Array.isArray(skills)) {
        updateData.skills = skills.map((s) => String(s).trim()).filter(Boolean);
      } else {
        return NextResponse.json({ error: 'Skills must be an array of strings.' }, { status: 400 });
      }
    }
    if (availability !== undefined) {
      updateData.availability = availability as EditorAvailability;
    }

    const profile = await db.editorProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        editorKey: generateEditorKey(),
        ...updateData,
      },
      update: updateData,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Optionally update user name to match display name if empty/changed
    if (displayName && !profile.user.name) {
      await db.user.update({
        where: { id: session.user.id },
        data: { name: displayName },
      });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('[EDITORS/PROFILE/PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
