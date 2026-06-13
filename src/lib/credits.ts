import { db } from '@/lib/db';

export type CreditType = 'SCRIPT' | 'VOICE' | 'VIDEO' | 'PUBLISH';

/**
 * Ensures a user has a credit wallet. If not, initializes one with standard defaults.
 */
export async function ensureCreditWallet(userId: string) {
  const wallet = await db.creditWallet.findUnique({
    where: { userId },
  });

  if (wallet) {
    return wallet;
  }

  // Calculate existing storage usage to make sure wallet starts with correct state
  const initialStorage = await calculateStorageUsedRaw(userId);

  // Fetch the user's organization ID
  const userObj = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  return await db.creditWallet.create({
    data: {
      userId,
      organizationId: userObj?.organizationId || null,
      scriptCredits: 10,
      voiceCredits: 10,
      videoCredits: 5,
      publishCredits: 5,
      storageLimitGB: 10.0,
      storageUsedGB: initialStorage,
    },
  });
}

/**
 * Checks if a user has sufficient credits of a given type.
 */
export async function hasCredits(
  userId: string,
  type: CreditType,
  amount = 1
): Promise<boolean> {
  const wallet = await ensureCreditWallet(userId);
  
  switch (type) {
    case 'SCRIPT':
      return wallet.scriptCredits >= amount;
    case 'VOICE':
      return wallet.voiceCredits >= amount;
    case 'VIDEO':
      return wallet.videoCredits >= amount;
    case 'PUBLISH':
      return wallet.publishCredits >= amount;
    default:
      return false;
  }
}

/**
 * Consumes credits from a user's wallet and records a transaction.
 */
export async function consumeCredits(
  userId: string,
  type: CreditType,
  amount = 1
): Promise<boolean> {
  // Ensure wallet exists
  await ensureCreditWallet(userId);

  const sufficient = await hasCredits(userId, type, amount);
  if (!sufficient) {
    return false;
  }

  const creditField = 
    type === 'SCRIPT' ? 'scriptCredits' :
    type === 'VOICE' ? 'voiceCredits' :
    type === 'VIDEO' ? 'videoCredits' : 'publishCredits';

  await db.$transaction([
    db.creditWallet.update({
      where: { userId },
      data: {
        [creditField]: { decrement: amount },
      },
    }),
    db.creditTransaction.create({
      data: {
        userId,
        creditType: type,
        amount: -amount,
        action: 'CONSUMED',
      },
    }),
  ]);

  // Check if credits are now low or exhausted and send low credit notifications
  const updatedWallet = await ensureCreditWallet(userId);
  const currentVal = updatedWallet[creditField];
  
  if (currentVal === 0) {
    await db.notification.create({
      data: {
        userId,
        title: 'Credits Exhausted',
        message: `Your ${type.toLowerCase()} credits are fully exhausted. Please contact an administrator to top up.`,
        type: 'SYSTEM',
      },
    });
  } else if (currentVal <= 2) {
    await db.notification.create({
      data: {
        userId,
        title: 'Credits Low',
        message: `You have only ${currentVal} ${type.toLowerCase()} credits remaining.`,
        type: 'SYSTEM',
      },
    });
  }

  return true;
}

/**
 * Adds credits to a user's wallet.
 */
export async function addCredits(
  userId: string,
  type: CreditType,
  amount: number,
  actorId?: string
): Promise<boolean> {
  console.log(`[CREDITS] actor ${actorId || 'SYSTEM'} added ${amount} ${type} credits to user ${userId}`);
  await ensureCreditWallet(userId);

  const creditField = 
    type === 'SCRIPT' ? 'scriptCredits' :
    type === 'VOICE' ? 'voiceCredits' :
    type === 'VIDEO' ? 'videoCredits' : 'publishCredits';

  await db.$transaction([
    db.creditWallet.update({
      where: { userId },
      data: {
        [creditField]: { increment: amount },
      },
    }),
    db.creditTransaction.create({
      data: {
        userId,
        creditType: type,
        amount,
        action: 'ADDED',
      },
    }),
  ]);

  // Notify user
  await db.notification.create({
    data: {
      userId,
      title: 'Credits Added',
      message: `An administrator added ${amount} ${type.toLowerCase()} credits to your wallet.`,
      type: 'SYSTEM',
    },
  });

  return true;
}

/**
 * Removes credits from a user's wallet.
 */
export async function removeCredits(
  userId: string,
  type: CreditType,
  amount: number,
  actorId?: string
): Promise<boolean> {
  console.log(`[CREDITS] actor ${actorId || 'SYSTEM'} removed ${amount} ${type} credits from user ${userId}`);
  const wallet = await ensureCreditWallet(userId);

  const creditField = 
    type === 'SCRIPT' ? 'scriptCredits' :
    type === 'VOICE' ? 'voiceCredits' :
    type === 'VIDEO' ? 'videoCredits' : 'publishCredits';

  const currentVal = wallet[creditField];
  const deductVal = Math.min(amount, currentVal); // Don't deduct past 0

  if (deductVal <= 0) return true;

  await db.$transaction([
    db.creditWallet.update({
      where: { userId },
      data: {
        [creditField]: { decrement: deductVal },
      },
    }),
    db.creditTransaction.create({
      data: {
        userId,
        creditType: type,
        amount: -deductVal,
        action: 'REMOVED',
      },
    }),
  ]);

  return true;
}

/**
 * Inner function to sum client video sizes.
 */
async function calculateStorageUsedRaw(userId: string): Promise<number> {
  const [videosSum, editedSum] = await Promise.all([
    db.video.aggregate({
      where: { userId },
      _sum: { fileSize: true },
    }),
    db.editedVideo.aggregate({
      where: {
        assignment: { userId },
      },
      _sum: { fileSize: true },
    }),
  ]);

  const totalBytes = (videosSum._sum.fileSize || 0) + (editedSum._sum.fileSize || 0);
  const totalGB = totalBytes / (1024 * 1024 * 1024);
  return parseFloat(totalGB.toFixed(4));
}

/**
 * Calculates, updates, and returns the total storage used by a user in GB.
 */
export async function calculateStorageUsed(userId: string): Promise<number> {
  await ensureCreditWallet(userId);
  const totalGB = await calculateStorageUsedRaw(userId);

  const wallet = await db.creditWallet.update({
    where: { userId },
    data: { storageUsedGB: totalGB },
  });

  // Alert admin or client if storage exceeds limit
  if (wallet.storageUsedGB >= wallet.storageLimitGB) {
    await db.notification.create({
      data: {
        userId,
        title: 'Storage Limit Exceeded',
        message: `Your Cloudflare R2 storage usage (${wallet.storageUsedGB} GB) has reached or exceeded your storage limit (${wallet.storageLimitGB} GB). Please delete older videos.`,
        type: 'SYSTEM',
      },
    });
  }

  return totalGB;
}
