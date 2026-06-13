import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

// Enforce admin access helper
async function checkAdminAccess() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return { error: 'Unauthorized', status: 401 };
  }

  const role = session.user.role;
  if (role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required', status: 403 };
  }

  return { orgId: session.user.organizationId, userId: session.user.id };
}

// GET: List all automation rules for the organization
export async function GET(request: NextRequest) {
  const access = await checkAdminAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const rules = await db.automationRule.findMany({
      where: { organizationId: access.orgId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('[GET_AUTOMATION_RULES_ERR]:', error);
    return NextResponse.json({ error: 'Failed to fetch automation rules' }, { status: 500 });
  }
}

// POST: Create a new automation rule
export async function POST(request: NextRequest) {
  const access = await checkAdminAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { triggerEvent, actionType, active } = await request.json();

    if (!triggerEvent || !actionType) {
      return NextResponse.json({ error: 'triggerEvent and actionType are required' }, { status: 400 });
    }

    const rule = await db.automationRule.create({
      data: {
        organizationId: access.orgId,
        triggerEvent,
        actionType,
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json({ message: 'Automation rule created successfully', rule });
  } catch (error) {
    console.error('[POST_AUTOMATION_RULE_ERR]:', error);
    return NextResponse.json({ error: 'Failed to create automation rule' }, { status: 500 });
  }
}

// PATCH: Update/Toggle an automation rule
export async function PATCH(request: NextRequest) {
  const access = await checkAdminAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { id, active, triggerEvent, actionType } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.automationRule.findFirst({
      where: { id, organizationId: access.orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Automation rule not found or access denied.' }, { status: 404 });
    }

    const updated = await db.automationRule.update({
      where: { id },
      data: {
        ...(active !== undefined && { active }),
        ...(triggerEvent && { triggerEvent }),
        ...(actionType && { actionType }),
      },
    });

    return NextResponse.json({ message: 'Automation rule updated successfully', rule: updated });
  } catch (error) {
    console.error('[PATCH_AUTOMATION_RULE_ERR]:', error);
    return NextResponse.json({ error: 'Failed to update automation rule' }, { status: 500 });
  }
}

// DELETE: Delete an automation rule
export async function DELETE(request: NextRequest) {
  const access = await checkAdminAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.automationRule.findFirst({
      where: { id, organizationId: access.orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Automation rule not found or access denied.' }, { status: 404 });
    }

    await db.automationRule.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Automation rule deleted successfully' });
  } catch (error) {
    console.error('[DELETE_AUTOMATION_RULE_ERR]:', error);
    return NextResponse.json({ error: 'Failed to delete automation rule' }, { status: 500 });
  }
}
