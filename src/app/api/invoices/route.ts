import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { SUBSCRIPTION_PLANS, SubscriptionPlanName } from '@/lib/plans';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let invoices = await db.invoice.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { issuedAt: 'desc' },
    });

    // Proactively generate a default mock invoice if none exist
    if (invoices.length === 0) {
      const org = await db.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { subscriptionPlan: true, createdAt: true },
      });

      if (org) {
        const planLimit = SUBSCRIPTION_PLANS[org.subscriptionPlan as SubscriptionPlanName] || SUBSCRIPTION_PLANS.FREE;
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-INIT`;
        const initialInvoice = await db.invoice.create({
          data: {
            organizationId: session.user.organizationId,
            amount: planLimit.price,
            currency: 'USD',
            status: planLimit.price === 0 ? 'VOID' : 'PAID',
            invoiceNumber,
            issuedAt: org.createdAt || new Date(),
          },
        });
        invoices = [initialInvoice];
      }
    }

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('[INVOICES_GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
