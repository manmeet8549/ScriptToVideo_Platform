import { db } from './db';

export async function runTenantBackfill() {
  const timestamp = new Date().toISOString();
  console.log(`[BACKFILL][${timestamp}] Starting Multi-Tenant Organization Backfill...`);

  try {
    // 1. Ensure a Default Organization exists
    let defaultOrg = await db.organization.findUnique({
      where: { slug: 'default' }
    });

    if (!defaultOrg) {
      console.log(`[BACKFILL][${timestamp}] Creating Default Organization...`);
      defaultOrg = await db.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default',
          logo: null,
          primaryColor: '#000000',
          secondaryColor: '#ffffff',
          status: 'ACTIVE',
          subscriptionPlan: 'PRO'
        }
      });
      console.log(`[BACKFILL][${timestamp}] Default Organization created with ID: ${defaultOrg.id}`);
    } else {
      console.log(`[BACKFILL][${timestamp}] Default Organization already exists (ID: ${defaultOrg.id})`);
    }

    // 2. Ensure default Subscription exists for the default organization
    const existingSub = await db.subscription.findFirst({
      where: { organizationId: defaultOrg.id }
    });
    if (!existingSub) {
      console.log(`[BACKFILL][${timestamp}] Creating default Subscription for Default Org...`);
      await db.subscription.create({
        data: {
          organizationId: defaultOrg.id,
          plan: 'PRO',
          status: 'ACTIVE',
          monthlyCredits: 200,
          storageLimit: 50.0
        }
      });
    }

    // 3. Backfill Users (Role ADMIN -> ORG_ADMIN, or default role USER, set organizationId)
    console.log(`[BACKFILL][${timestamp}] Backfilling Users...`);
    const users = await db.user.findMany({
      where: {
        OR: [
          { organizationId: null },
          { role: 'ADMIN' }
        ]
      }
    });

    for (const u of users) {
      let nextRole = u.role;
      // Upgrade ADMIN to ORG_ADMIN (so they can manage the default organization)
      if (u.role === 'ADMIN') {
        nextRole = 'ORG_ADMIN';
      }
      
      await db.user.update({
        where: { id: u.id },
        data: {
          organizationId: defaultOrg.id,
          role: nextRole
        }
      });
      console.log(`[BACKFILL][${timestamp}] Updated user ${u.email}: Role=${nextRole}, OrgId=${defaultOrg.id}`);
    }

    // 4. Backfill Projects
    console.log(`[BACKFILL][${timestamp}] Backfilling Projects...`);
    const projectsCount = await db.project.updateMany({
      where: { organizationId: null },
      data: { organizationId: defaultOrg.id }
    });
    console.log(`[BACKFILL][${timestamp}] Backfilled ${projectsCount.count} Projects.`);

    // 5. Backfill Videos
    console.log(`[BACKFILL][${timestamp}] Backfilling Videos...`);
    const videosCount = await db.video.updateMany({
      where: { organizationId: null },
      data: { organizationId: defaultOrg.id }
    });
    console.log(`[BACKFILL][${timestamp}] Backfilled ${videosCount.count} Videos.`);

    // 6. Backfill SocialAccounts
    console.log(`[BACKFILL][${timestamp}] Backfilling Social Accounts...`);
    const socialCount = await db.socialAccount.updateMany({
      where: { organizationId: null },
      data: { organizationId: defaultOrg.id }
    });
    console.log(`[BACKFILL][${timestamp}] Backfilled ${socialCount.count} Social Accounts.`);

    // 7. Backfill CreditWallets
    console.log(`[BACKFILL][${timestamp}] Backfilling Credit Wallets...`);
    const walletCount = await db.creditWallet.updateMany({
      where: { organizationId: null },
      data: { organizationId: defaultOrg.id }
    });
    console.log(`[BACKFILL][${timestamp}] Backfilled ${walletCount.count} Credit Wallets.`);

    // 8. ProviderKeys remain user-scoped by default to avoid unique constraint violations
    console.log(`[BACKFILL][${timestamp}] Skipping Provider Keys backfill (retained as user-scoped keys).`);

    console.log(`[BACKFILL][${timestamp}] Multi-Tenant Backfill complete!`);
  } catch (error) {
    console.error(`[BACKFILL][${timestamp}] Error during backfill:`, error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runTenantBackfill()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
