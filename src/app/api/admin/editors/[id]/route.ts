import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(session?.user?.role || '');
  if (!session?.user?.id || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await props.params;

  try {
    const editor = await db.user.findFirst({
      where: { id, role: 'EDITOR', deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
        editorProfile: {
          select: {
            editorKey: true,
          },
        },
      },
    });

    if (!editor) {
      return NextResponse.json({ error: 'Editor not found.' }, { status: 404 });
    }

    // Future phases will link projects to editors. Returning empty placeholders for now.
    const assignedProjects: unknown[] = [];
    const completedProjects: unknown[] = [];

    return NextResponse.json({
      editor: {
        id: editor.id,
        name: editor.name,
        email: editor.email,
        role: editor.role,
        status: editor.accountStatus,
        createdAt: editor.createdAt,
        lastLoginAt: editor.lastLoginAt,
        editorKey: editor.editorProfile?.editorKey || null,
      },
      assignedProjects,
      completedProjects,
    });
  } catch (error) {
    console.error(`[ADMIN/EDITOR/GET] Error for ID ${id}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve editor details.' }, { status: 500 });
  }
}
