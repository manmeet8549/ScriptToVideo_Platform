import { db } from '@/lib/db';
import { Role, AccountStatus } from '@prisma/client';

type UserInput = string | { role: Role; accountStatus: AccountStatus };

/**
 * Resolves the user's role and accountStatus from the database if a string ID is provided.
 * Otherwise, uses the passed User object.
 */
async function resolveUser(userInput: UserInput): Promise<{ role: Role; accountStatus: AccountStatus } | null> {
  if (typeof userInput === 'string') {
    try {
      const user = await db.user.findUnique({
        where: { id: userInput },
        select: { role: true, accountStatus: true },
      });
      return user;
    } catch (error) {
      console.error(`[RBAC] Failed to resolve user from DB for ID: ${userInput}`, error);
      return null;
    }
  }
  return userInput;
}

// ─── Permission Helpers ──────────────────────────────────────────────────────

/**
 * Checks if the user has ADMIN role.
 */
export async function isAdmin(user: UserInput): Promise<boolean> {
  const resolved = await resolveUser(user);
  if (!resolved) return false;
  return resolved.role === Role.ADMIN;
}

/**
 * Checks if the user has USER or ADMIN role.
 */
export async function isUser(user: UserInput): Promise<boolean> {
  const resolved = await resolveUser(user);
  if (!resolved) return false;
  return resolved.role === Role.ADMIN || resolved.role === Role.USER;
}

/**
 * Checks if the user has EDITOR or ADMIN role.
 */
export async function isEditor(user: UserInput): Promise<boolean> {
  const resolved = await resolveUser(user);
  if (!resolved) return false;
  return resolved.role === Role.ADMIN || resolved.role === Role.EDITOR;
}

// ─── Account Status Checks ────────────────────────────────────────────────────

/**
 * Checks if the user account status is ACTIVE.
 */
export async function isActive(user: UserInput): Promise<boolean> {
  const resolved = await resolveUser(user);
  if (!resolved) return false;
  return resolved.accountStatus === AccountStatus.ACTIVE;
}

/**
 * Checks if the user account status is PAUSED.
 */
export async function isPaused(user: UserInput): Promise<boolean> {
  const resolved = await resolveUser(user);
  if (!resolved) return false;
  return resolved.accountStatus === AccountStatus.PAUSED;
}

/**
 * Checks if the user account status is STOPPED.
 */
export async function isStopped(user: UserInput): Promise<boolean> {
  const resolved = await resolveUser(user);
  if (!resolved) return false;
  return resolved.accountStatus === AccountStatus.STOPPED;
}

/**
 * Checks if the user account status is DELETED.
 */
export async function isDeleted(user: UserInput): Promise<boolean> {
  const resolved = await resolveUser(user);
  if (!resolved) return false;
  return resolved.accountStatus === AccountStatus.DELETED;
}
