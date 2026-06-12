import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * Generates a unique editor key in the format: EDT-K9P2X-81M7Q
 */
export function generateEditorKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const genGroup = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `EDT-${genGroup()}-${genGroup()}`;
}

/**
 * Generates a temporary random password for user invitations/resets.
 */
export function generateTemporaryPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{}';
  const allChars = lowercase + uppercase + numbers + symbols;

  const randChar = (str: string) => str[Math.floor(Math.random() * str.length)];

  // Ensure it has at least one of each class
  const passwordArray = [
    randChar(lowercase),
    randChar(uppercase),
    randChar(numbers),
    randChar(symbols),
  ];

  // Fill up to 12 characters
  for (let i = 0; i < 8; i++) {
    passwordArray.push(randChar(allChars));
  }

  // Shuffle array
  return passwordArray.sort(() => Math.random() - 0.5).join('');
}

/**
 * Writes an administrative or system action into the ActivityLog database.
 */
export async function logActivity(
  actorId: string,
  action: string,
  targetUserId?: string | null,
  metadata?: Prisma.InputJsonValue
): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        actorId,
        targetUserId: targetUserId || null,
        action,
        metadata: metadata ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error('[ACTIVITY_LOG] Failed to create activity log:', error);
  }
}
