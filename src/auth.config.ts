import NextAuth from 'next-auth';
import type { NextAuthConfig, DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    accountStatus?: string;
    mustChangePassword?: boolean;
    organizationId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      accountStatus: string;
      mustChangePassword: boolean;
      organizationId?: string | null;
    } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    accountStatus?: string;
    mustChangePassword?: boolean;
    organizationId?: string | null;
  }
}

export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [], // Configured in auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accountStatus = user.accountStatus;
        token.mustChangePassword = user.mustChangePassword;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.accountStatus = token.accountStatus as string;
        session.user.mustChangePassword = !!token.mustChangePassword;
        session.user.organizationId = token.organizationId as string | null | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { auth: edgeAuth } = NextAuth(authConfig);
