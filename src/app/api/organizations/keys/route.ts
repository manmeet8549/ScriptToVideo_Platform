import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

const VALID_PROVIDERS = ['NVIDIA', 'ELEVENLABS', 'HEYGEN'];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await db.providerKey.findMany({
      where: { organizationId: session.user.organizationId },
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
    console.error('[ORG-KEYS GET] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve organization provider keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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
          organizationId: session.user.organizationId,
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
    } else {
      prefix = trimmedKey.substring(0, Math.min(trimmedKey.length, 8));
      lastFour = trimmedKey.slice(-4);
    }

    // Encrypt the key
    const encryptedValue = encrypt(trimmedKey);

    // Upsert into the database
    const saved = await db.providerKey.upsert({
      where: {
        organizationId_provider: {
          organizationId: session.user.organizationId,
          provider: providerUpper,
        },
      },
      update: {
        value: encryptedValue,
        prefix,
        lastFour,
      },
      create: {
        organizationId: session.user.organizationId,
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
    console.error('[ORG-KEYS POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save organization provider key' }, { status: 500 });
  }
}
