import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ensureCreditWallet } from '@/lib/credits';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const wallet = await ensureCreditWallet(session.user.id);
    return NextResponse.json({ wallet });
  } catch (error) {
    console.error('[API/USER/CREDITS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch credit wallet.' }, { status: 500 });
  }
}
