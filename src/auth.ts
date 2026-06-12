import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { z } from 'zod';
import { authConfig } from './auth.config';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        if (user.accountStatus === 'DELETED' || user.accountStatus === 'STOPPED') {
          console.warn(`[AUTH] Blocked credentials login attempt for ${email} (Status: ${user.accountStatus})`);
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          accountStatus: user.accountStatus,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (user.id) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { accountStatus: true },
        });

        if (dbUser && (dbUser.accountStatus === 'DELETED' || dbUser.accountStatus === 'STOPPED')) {
          console.warn(`[AUTH] Blocked OAuth login attempt for ${user.email} (Status: ${dbUser.accountStatus})`);
          return false;
        }

        // Update lastLoginAt
        try {
          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        } catch (err) {
          console.error('[AUTH] Failed to update lastLoginAt:', err);
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // First let base jwt callback assign basic user fields
      token = await authConfig.callbacks.jwt({ token, user });

      // If we are in Node.js server context, check database for latest role/status if missing
      if (!user && token.id && (!token.role || !token.accountStatus || token.mustChangePassword === undefined)) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true, accountStatus: true, mustChangePassword: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.accountStatus = dbUser.accountStatus;
          token.mustChangePassword = dbUser.mustChangePassword;
        }
      }
      return token;
    },
  },
});
