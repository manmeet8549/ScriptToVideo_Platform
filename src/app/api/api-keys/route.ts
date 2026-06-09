import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const createKeySchema = z.object({
  name: z.string().min(1).max(60),
  scopes: z.array(z.string()).default(['read']),
  expiresAt: z.string().datetime().optional(),
});

// GET /api/api-keys
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await db.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsed: true,
      expiresAt: true,
      createdAt: true,
      // keyHash is intentionally excluded from listings
    },
  });

  return NextResponse.json({ keys });
}

// POST /api/api-keys
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Generate a secure random key (shown once only)
    const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 16);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await db.apiKey.create({
      data: {
        name: parsed.data.name,
        keyHash,
        keyPrefix,
        scopes: parsed.data.scopes,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return the raw key ONLY on creation — never stored in plain text
    return NextResponse.json({ apiKey, rawKey }, { status: 201 });
  } catch (error) {
    console.error('[API-KEYS] POST Error:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
