import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['USER', 'EDITOR', 'ADMIN']).default('ADMIN'),
});

/**
 * GET check to verify if public administrator registration is allowed (no admin exists yet).
 */
export async function GET() {
  try {
    const adminExists = await db.user.findFirst({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'],
        },
      },
    });

    return NextResponse.json({ enabled: !adminExists });
  } catch (error) {
    console.error('[REGISTER/GET] Error:', error);
    return NextResponse.json({ enabled: false, error: 'Database check failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;

    // Public registration only allows ADMIN creation
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Public registration only allows creating Administrator accounts.' },
        { status: 400 }
      );
    }

    // Check if an admin already exists in the database
    const adminExists = await db.user.findFirst({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'],
        },
      },
    });

    if (adminExists) {
      return NextResponse.json(
        { error: 'Registration is disabled. An Administrator already exists.' },
        { status: 403 }
      );
    }

    // Check if email already exists (even if it's a User/Editor, we can't reuse emails)
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the first admin
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
      },
    });

    return NextResponse.json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      } 
    }, { status: 201 });
  } catch (error) {
    console.error('[REGISTER/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
