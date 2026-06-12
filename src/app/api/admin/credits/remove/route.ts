import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { removeCredits, CreditType } from '@/lib/credits';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, type, amount } = await req.json();

    if (!userId || !type || amount === undefined || amount <= 0) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    const validTypes: CreditType[] = ['SCRIPT', 'VOICE', 'VIDEO', 'PUBLISH'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid credit type' }, { status: 400 });
    }

    const success = await removeCredits(userId, type, amount, session.user.id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to remove credits' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN/CREDITS/REMOVE] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
