import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { CalendarEventType, EventPriority, EventStatus } from '@prisma/client';

// GET /api/calendar — list events based on user role
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, role } = session.user;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(role || '');

  try {
    const whereClause: any = {};

    if (!isAdmin) {
      if (role === 'EDITOR') {
        whereClause.editorId = id;
      } else {
        whereClause.userId = id;
      }
    }

    const events = await db.calendarEvent.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        editor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('[CALENDAR/GET] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve calendar events.' }, { status: 500 });
  }
}

// POST /api/calendar — create new event (Admin only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role || '');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, type, startDate, dueDate, priority, status, userId, editorId } = body;

    if (!title || !type || !startDate || !dueDate) {
      return NextResponse.json({ error: 'Title, type, startDate, and dueDate are required.' }, { status: 400 });
    }

    const event = await db.calendarEvent.create({
      data: {
        title,
        description: description || null,
        type: type as CalendarEventType,
        startDate: new Date(startDate),
        dueDate: new Date(dueDate),
        priority: (priority as EventPriority) || EventPriority.MEDIUM,
        status: (status as EventStatus) || EventStatus.PENDING,
        userId: userId || null,
        editorId: editorId || null,
      },
      include: {
        user: { select: { name: true, email: true } },
        editor: { select: { name: true, email: true } },
      },
    });

    // Create notifications for assigned user and editor
    const notifs: any[] = [];
    const formattedDueDate = new Date(dueDate).toLocaleDateString();

    if (userId) {
      notifs.push({
        userId,
        title: `Calendar: ${title}`,
        message: `You have been assigned to event "${title}" (${type}). Due: ${formattedDueDate}.`,
        type: 'CALENDAR',
      });
    }

    if (editorId) {
      notifs.push({
        userId: editorId,
        title: `Calendar: ${title}`,
        message: `You have been assigned to editing task "${title}" (${type}). Due: ${formattedDueDate}.`,
        type: 'CALENDAR',
      });
    }

    if (notifs.length > 0) {
      await db.notification.createMany({
        data: notifs,
      });
    }

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error('[CALENDAR/POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create calendar event.' }, { status: 500 });
  }
}

// PATCH /api/calendar — update event status/details
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, description, type, startDate, dueDate, priority, status, userId, editorId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    // Check if event exists
    const existing = await db.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    // Role check: admins can edit everything, assigned user/editor can edit status
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role || '');
    const isAssigned = existing.userId === session.user.id || existing.editorId === session.user.id;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = {};
    if (isAdmin) {
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type as CalendarEventType;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (priority !== undefined) updateData.priority = priority as EventPriority;
      if (userId !== undefined) updateData.userId = userId || null;
      if (editorId !== undefined) updateData.editorId = editorId || null;
    }
    // Users and editors can update status
    if (status !== undefined) {
      updateData.status = status as EventStatus;
    }

    const updated = await db.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { name: true, email: true } },
        editor: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    console.error('[CALENDAR/PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update calendar event.' }, { status: 500 });
  }
}

// DELETE /api/calendar — delete event (Admin only)
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role || '');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    await db.calendarEvent.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('[CALENDAR/DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete calendar event.' }, { status: 500 });
  }
}
