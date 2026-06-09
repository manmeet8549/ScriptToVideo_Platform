import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

const VALID_PROVIDERS = ['NVIDIA', 'ELEVENLABS', 'HEYGEN'];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { provider, key } = await request.json();

    if (!provider || !VALID_PROVIDERS.includes(provider.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid provider parameter' }, { status: 400 });
    }

    const providerUpper = provider.toUpperCase();
    let rawKey = '';

    // If key is provided in body, test that key. Otherwise, retrieve stored key.
    if (key && key.trim() !== '') {
      rawKey = key.trim();
    } else {
      const stored = await db.providerKey.findUnique({
        where: {
          userId_provider: {
            userId: session.user.id,
            provider: providerUpper,
          },
        },
      });

      if (!stored) {
        return NextResponse.json({ success: false, message: 'No key stored for this provider' }, { status: 400 });
      }

      try {
        rawKey = decrypt(stored.value);
      } catch (decryptionError) {
        console.error('Decryption failed for stored key:', decryptionError);
        return NextResponse.json({ success: false, message: 'Failed to decrypt stored credential' }, { status: 500 });
      }
    }

    // Probing connection
    let isValid = false;
    let errorMessage = '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      if (providerUpper === 'NVIDIA') {
        const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${rawKey}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          isValid = true;
        } else {
          const body = await res.json().catch(() => ({}));
          errorMessage = body?.error?.message || `NVIDIA NIM responded with status ${res.status}`;
        }
      } else if (providerUpper === 'ELEVENLABS') {
        const res = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': rawKey,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          isValid = true;
        } else {
          const body = await res.json().catch(() => ({}));
          errorMessage = body?.detail?.status || `ElevenLabs responded with status ${res.status}`;
        }
      } else if (providerUpper === 'HEYGEN') {
        const res = await fetch('https://api.heygen.com/v2/avatars', {
          headers: {
            'X-Api-Key': rawKey,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          isValid = true;
        } else {
          const body = await res.json().catch(() => ({}));
          errorMessage = body?.message || `HeyGen responded with status ${res.status}`;
        }
      }
    } catch (fetchError) {
      const err = fetchError as Error;
      if (err.name === 'AbortError') {
        errorMessage = 'Connection timed out. Please try again.';
      } else {
        console.error(`Fetch error for ${providerUpper}:`, fetchError);
        errorMessage = `Network failure: Unable to reach ${provider} endpoints.`;
      }
    }

    if (isValid) {
      return NextResponse.json({ success: true, message: 'Connection verified successfully' });
    } else {
      return NextResponse.json({ success: false, message: errorMessage || 'Invalid API Key configuration' });
    }
  } catch (error) {
    console.error('[PROVIDER-KEYS TEST] Error:', error);
    return NextResponse.json({ error: 'Failed to test provider key' }, { status: 500 });
  }
}
