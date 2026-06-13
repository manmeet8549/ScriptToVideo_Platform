import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

const VALID_PROVIDERS = ['OPENAI', 'NVIDIA', 'ELEVENLABS', 'HEYGEN', 'ZERNIO'];

// GET /api/provider-keys - List connected status and details of user's provider keys (keys are masked)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ORG_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const keys = await db.providerKey.findMany({
      where: { userId: session.user.id },
      select: {
        provider: true,
        prefix: true,
        lastFour: true,
        updatedAt: true,
      },
    });

    // Create a map of connected providers
    const connectedProviders = VALID_PROVIDERS.reduce((acc, provider) => {
      const stored = keys.find((k) => k.provider === provider);
      acc[provider] = stored
        ? {
            connected: true,
            prefix: stored.prefix || '',
            lastFour: stored.lastFour || '',
            updatedAt: stored.updatedAt,
          }
        : {
            connected: false,
            prefix: '',
            lastFour: '',
            updatedAt: null,
          };
      return acc;
    }, {} as Record<string, { connected: boolean; prefix: string; lastFour: string; updatedAt: Date | null }>);

    return NextResponse.json({ keys: connectedProviders });
  } catch (error) {
    console.error('[PROVIDER-KEYS GET] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve provider keys' }, { status: 500 });
  }
}

// POST /api/provider-keys - Save, update, or remove a provider key
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ORG_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { provider, key } = await request.json();

    if (!provider || !VALID_PROVIDERS.includes(provider.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid provider parameter' }, { status: 400 });
    }

    const providerUpper = provider.toUpperCase();

    // If key is empty/null, delete the provider key (disconnecting it)
    if (!key || key.trim() === '') {
      await db.providerKey.deleteMany({
        where: {
          userId: session.user.id,
          provider: providerUpper,
        },
      });
      return NextResponse.json({ success: true, connected: false });
    }

    const trimmedKey = key.trim();

    // Determine prefix and last four
    let prefix = '';
    let lastFour = '';

    if (providerUpper === 'NVIDIA') {
      prefix = 'nvapi-';
      lastFour = trimmedKey.slice(-4);
    } else if (providerUpper === 'ELEVENLABS') {
      prefix = 'sk_';
      lastFour = trimmedKey.slice(-4);
    } else if (providerUpper === 'OPENAI') {
      prefix = 'sk-proj-';
      lastFour = trimmedKey.slice(-4);
    } else if (providerUpper === 'ZERNIO') {
      prefix = 'zr-';
      lastFour = trimmedKey.slice(-4);
    } else {
      prefix = trimmedKey.substring(0, Math.min(trimmedKey.length, 8));
      lastFour = trimmedKey.slice(-4);
    }

    // Encrypt the key
    const encryptedValue = encrypt(trimmedKey);

    // Upsert into the database
    const saved = await db.providerKey.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: providerUpper,
        },
      },
      update: {
        value: encryptedValue,
        prefix,
        lastFour,
      },
      create: {
        userId: session.user.id,
        provider: providerUpper,
        value: encryptedValue,
        prefix,
        lastFour,
      },
    });

    return NextResponse.json({
      success: true,
      connected: true,
      provider: saved.provider,
      prefix: saved.prefix,
      lastFour: saved.lastFour,
    });
  } catch (error) {
    console.error('[PROVIDER-KEYS POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save provider key' }, { status: 500 });
  }
}
