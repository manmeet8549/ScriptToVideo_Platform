import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

// GET: List all recurring templates for the organization
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const userId = session.user.id;

  try {
    const whereClause = orgId ? { organizationId: orgId } : { organizationId: 'default' };
    const templates = await db.recurringTemplate.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[GET_RECURRING_ERR]:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring templates' }, { status: 500 });
  }
}

// POST: Create a new recurring template
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const userId = session.user.id;

  try {
    const { name, prompt, frequency, dayOfWeek, dayOfMonth, timeOfDay } = await request.json();

    if (!name || !prompt || !frequency || !timeOfDay) {
      return NextResponse.json({ error: 'name, prompt, frequency, and timeOfDay are required' }, { status: 400 });
    }

    const template = await db.recurringTemplate.create({
      data: {
        organizationId: orgId || 'default',
        name,
        prompt,
        frequency,
        dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek) : null,
        dayOfMonth: dayOfMonth !== undefined ? parseInt(dayOfMonth) : null,
        timeOfDay,
        active: true,
      },
    });

    return NextResponse.json({ message: 'Recurring content template created', template });
  } catch (error) {
    console.error('[POST_RECURRING_ERR]:', error);
    return NextResponse.json({ error: 'Failed to create recurring template' }, { status: 500 });
  }
}

// PATCH: Update/Toggle recurring template
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  try {
    const { id, active, name, prompt, frequency, dayOfWeek, dayOfMonth, timeOfDay } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.recurringTemplate.findFirst({
      where: orgId ? { id, organizationId: orgId } : { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found or access denied.' }, { status: 404 });
    }

    const updated = await db.recurringTemplate.update({
      where: { id },
      data: {
        ...(active !== undefined && { active }),
        ...(name && { name }),
        ...(prompt && { prompt }),
        ...(frequency && { frequency }),
        ...(dayOfWeek !== undefined && { dayOfWeek: dayOfWeek !== null ? parseInt(dayOfWeek) : null }),
        ...(dayOfMonth !== undefined && { dayOfMonth: dayOfMonth !== null ? parseInt(dayOfMonth) : null }),
        ...(timeOfDay && { timeOfDay }),
      },
    });

    return NextResponse.json({ message: 'Template updated successfully', template: updated });
  } catch (error) {
    console.error('[PATCH_RECURRING_ERR]:', error);
    return NextResponse.json({ error: 'Failed to update recurring template' }, { status: 500 });
  }
}

// DELETE: Delete a template
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.recurringTemplate.findFirst({
      where: orgId ? { id, organizationId: orgId } : { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found or access denied.' }, { status: 404 });
    }

    await db.recurringTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('[DELETE_RECURRING_ERR]:', error);
    return NextResponse.json({ error: 'Failed to delete recurring template' }, { status: 500 });
  }
}
