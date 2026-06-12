import NextAuth from 'next-auth';
import type { NextAuthConfig, DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    accountStatus?: string;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      accountStatus: string;
      mustChangePassword: boolean;
    } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    accountStatus?: string;
    mustChangePassword?: boolean;
  }
}

export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/' },
  providers: [], // Configured in auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accountStatus = user.accountStatus;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.accountStatus = token.accountStatus as string;
        session.user.mustChangePassword = !!token.mustChangePassword;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { auth: edgeAuth } = NextAuth(authConfig);
