import { edgeAuth as auth } from '@/auth.config';
import { NextResponse } from 'next/server';

export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;
  const path = nextUrl.pathname;

  // Define route classifications
  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin');
  const isEditorRoute = path.startsWith('/editor') || path.startsWith('/api/editor');
  
  // Protect /user and /api/user routes (exempting NextAuth endpoints and common profile/settings checks if needed)
  const isUserRoute = 
    (path.startsWith('/user') || path.startsWith('/api/user')) && 
    !path.startsWith('/api/auth') && 
    path !== '/api/user/settings';

  const isProtectedRoute = isAdminRoute || isEditorRoute || isUserRoute;

  // 1. Unauthenticated checks for protected routes
  if (!isLoggedIn) {
    if (isProtectedRoute) {
      if (path.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/', nextUrl.origin));
    }
    return NextResponse.next();
  }

  // 2. Authenticated user checks (role & status)
  if (user) {
    const role = user.role;
    const status = user.accountStatus;

    // A. Enforce STOPPED or DELETED constraints
    if (status === 'STOPPED' || status === 'DELETED') {
      // Allow signout/auth callbacks to avoid redirect loops or lockout from logging out
      if (path.startsWith('/api/auth') || path.startsWith('/api/publish/disconnect')) {
        return NextResponse.next();
      }

      if (path.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Account disabled. Please contact administrator.' },
          { status: 403 }
        );
      }
      return new NextResponse('Account disabled. Please contact support.', { status: 403 });
    }

    // B. Enforce PAUSED status constraints
    if (status === 'PAUSED') {
      const isGenerationApi = 
        path.startsWith('/api/generate/script') ||
        path.startsWith('/api/generate/voice') ||
        path.startsWith('/api/generate/video');
      const isPublishApi = path.startsWith('/api/publish/upload');

      if (isGenerationApi || isPublishApi) {
        return NextResponse.json(
          { error: 'Account is paused. Content generation and publishing are disabled.' },
          { status: 403 }
        );
      }
    }

    // C. Enforce Admin Routes (Only ADMIN)
    if (isAdminRoute) {
      if (role !== 'ADMIN') {
        if (path.startsWith('/api')) {
          return NextResponse.json({ error: 'Access denied. Administrator role required.' }, { status: 403 });
        }
        return new NextResponse('Access denied. Administrator role required.', { status: 403 });
      }
    }

    // D. Enforce Editor Routes (ADMIN + EDITOR)
    if (isEditorRoute) {
      if (role !== 'ADMIN' && role !== 'EDITOR') {
        if (path.startsWith('/api')) {
          return NextResponse.json({ error: 'Access denied. Editor role required.' }, { status: 403 });
        }
        return new NextResponse('Access denied. Editor role required.', { status: 403 });
      }
    }

    // E. Enforce User Routes (ADMIN + USER)
    if (isUserRoute) {
      if (role !== 'ADMIN' && role !== 'USER') {
        if (path.startsWith('/api')) {
          return NextResponse.json({ error: 'Access denied. User role required.' }, { status: 403 });
        }
        return new NextResponse('Access denied. User role required.', { status: 403 });
      }
    }
  }

  return NextResponse.next();
});

// Configure matcher to intercept appropriate paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (public images)
     * - ThinkNEXT-LOGO-NEW.svg
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|ThinkNEXT-LOGO-NEW.svg).*)',
  ],
};
