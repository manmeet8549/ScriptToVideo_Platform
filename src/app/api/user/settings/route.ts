import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  fullName: z.string().min(1).max(100),
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9__]+$/, {
    message: 'Username can only contain alphanumeric characters, underscores, and cannot have spaces.'
  }),
  bio: z.string().max(500).optional().default(''),
  defaultLanguage: z.string().default('English (US)'),
  defaultDuration: z.string().default('30 Seconds'),
  defaultTone: z.string().default('Professional'),
  theme: z.enum(['System', 'Light', 'Dark']).default('System'),
  avatarUrl: z.string().optional(),
});

// GET /api/user/settings - Get settings profile and stats for the active user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Fetch user and settings
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure settings exist (auto-create default settings row if missing)
    let settings = user.settings;
    if (!settings) {
      const defaultUsername = user.email.split('@')[0] || 'user';
      settings = await db.userSettings.create({
        data: {
          userId,
          username: defaultUsername,
          bio: '',
          defaultLanguage: 'English (US)',
          defaultDuration: '30 Seconds',
          defaultTone: 'Professional',
          theme: 'System',
        },
      });
    }

    // Fetch statistics
    const projectsCreated = await db.project.count({
      where: { userId },
    });

    const connectedProviders = await db.providerKey.count({
      where: { userId },
    });

    // Format member since date (e.g., "Oct 2023")
    const createdAt = user.createdAt || new Date();
    const memberSince = createdAt.toLocaleString('en-US', { month: 'short', year: 'numeric' });

    return NextResponse.json({
      fullName: user.name || '',
      email: user.email,
      avatarUrl: user.image || '/avatars/male.svg',
      settings: {
        username: settings.username || '',
        bio: settings.bio || '',
        defaultLanguage: settings.defaultLanguage,
        defaultDuration: settings.defaultDuration,
        defaultTone: settings.defaultTone,
        theme: settings.theme,
      },
      stats: {
        memberSince,
        projectsCreated,
        connectedProviders,
      },
      security: {
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        passwordChangedAt: user.passwordChangedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('[SETTINGS GET] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve settings' }, { status: 500 });
  }
}

// POST /api/user/settings - Update settings profile and user name
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      fullName,
      username,
      bio,
      defaultLanguage,
      defaultDuration,
      defaultTone,
      theme,
      avatarUrl,
    } = parsed.data;

    // Update user profile name
    await db.user.update({
      where: { id: userId },
      data: { 
        name: fullName,
        ...(avatarUrl !== undefined && { image: avatarUrl })
      },
    });

    // Upsert user settings
    const updatedSettings = await db.userSettings.upsert({
      where: { userId },
      update: {
        username,
        bio,
        defaultLanguage,
        defaultDuration,
        defaultTone,
        theme,
      },
      create: {
        userId,
        username,
        bio,
        defaultLanguage,
        defaultDuration,
        defaultTone,
        theme,
      },
    });

    return NextResponse.json({
      success: true,
      fullName,
      avatarUrl,
      settings: {
        username: updatedSettings.username,
        bio: updatedSettings.bio,
        defaultLanguage: updatedSettings.defaultLanguage,
        defaultDuration: updatedSettings.defaultDuration,
        defaultTone: updatedSettings.defaultTone,
        theme: updatedSettings.theme,
      },
    });
  } catch (error) {
    console.error('[SETTINGS POST] Error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
