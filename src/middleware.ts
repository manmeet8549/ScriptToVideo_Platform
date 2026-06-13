import { edgeAuth as auth } from '@/auth.config';
import { NextResponse } from 'next/server';

function getDashboardUrl(role: string | undefined): string {
  if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'ADMIN') {
    return '/admin/dashboard';
  } else if (role === 'EDITOR') {
    return '/editor/dashboard';
  } else {
    return '/user/dashboard';
  }
}

export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;
  const path = nextUrl.pathname;

  // 1. Ignore static/next assets and public files to speed up processing
  if (
    path.startsWith('/_next') ||
    path.includes('.') ||
    path.startsWith('/images/')
  ) {
    return NextResponse.next();
  }

  // 2. Define route classifications
  const isSuperAdminRoute = path.startsWith('/super-admin') || path.startsWith('/api/super-admin');
  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin');
  const isEditorRoute = path.startsWith('/editor') || path.startsWith('/api/editor');
  const isUserRoute = path.startsWith('/user') || path.startsWith('/api/user');

  const isProtectedRoute = (isSuperAdminRoute || isAdminRoute || isEditorRoute || isUserRoute) && 
    !path.startsWith('/api/auth');

  const isAuthPage = path === '/login' || path === '/signup' || path === '/signin';

  // We will track the redirect destination if any
  let targetRoute: string | null = null;

  // 3. Unauthenticated User checks
  if (!isLoggedIn) {
    if (isProtectedRoute) {
      if (path.startsWith('/api')) {
        targetRoute = 'API_UNAUTHORIZED';
      } else {
        targetRoute = '/login';
      }
    }
  } else if (user) {
    // 4. Authenticated User checks
    const role = user.role;
    const status = user.accountStatus;

    // A. Stopped/Deleted block
    if (status === 'STOPPED' || status === 'DELETED') {
      const isExempt = path.startsWith('/api/auth') || path.startsWith('/api/publish/disconnect');
      if (!isExempt) {
        if (path.startsWith('/api')) {
          targetRoute = 'API_DISABLED';
        } else {
          targetRoute = 'DISABLED_HTML';
        }
      }
    } else {
      // B. Paused status API locks
      if (status === 'PAUSED') {
        const isGenerationApi = 
          path.startsWith('/api/generate/script') ||
          path.startsWith('/api/generate/voice') ||
          path.startsWith('/api/generate/video');
        const isPublishApi = path.startsWith('/api/publish/upload');

        if (isGenerationApi || isPublishApi) {
          targetRoute = 'API_PAUSED';
        }
      }

      // Only perform role redirection logic if status is not blocked or paused-api
      if (!targetRoute) {
        const resolvedRole = role || 'USER';

        // C. Authenticated users trying to hit /login, /signup, /signin -> Redirect to their dashboard
        if (isAuthPage) {
          targetRoute = getDashboardUrl(resolvedRole);
        }

        // D. Strict Role Access Protection
        const isAdminRole = resolvedRole === 'SUPER_ADMIN' || resolvedRole === 'ORG_ADMIN' || resolvedRole === 'ADMIN';
        const isEditorRole = resolvedRole === 'EDITOR';
        const isUserRoleType = resolvedRole === 'USER';

        if (isAdminRoute || isSuperAdminRoute) {
          if (!isAdminRole) {
            targetRoute = getDashboardUrl(resolvedRole);
          }
        } else if (isEditorRoute) {
          if (!isEditorRole) {
            targetRoute = getDashboardUrl(resolvedRole);
          }
        } else if (isUserRoute) {
          if (!isUserRoleType) {
            targetRoute = getDashboardUrl(resolvedRole);
          }
        }
      }
    }
  }

  // 5. Debug Logging (Task 6)
  const resolvedRole = user?.role || (isLoggedIn ? 'USER' : undefined);
  console.log({
    pathname: path,
    role: resolvedRole,
    isAuthenticated: isLoggedIn,
    targetRoute: targetRoute
  });

  // 6. Execute Redirection or Next request
  if (targetRoute) {
    if (targetRoute === 'API_UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (targetRoute === 'API_DISABLED') {
      return NextResponse.json({ error: 'Account disabled. Please contact administrator.' }, { status: 403 });
    }
    if (targetRoute === 'API_PAUSED') {
      return NextResponse.json({ error: 'Account is paused. Content generation is disabled.' }, { status: 403 });
    }
    if (targetRoute === 'DISABLED_HTML') {
      return new NextResponse('Account disabled. Please contact support.', { status: 403 });
    }

    // Prevent Self-Redirect loops (Task 5)
    if (path === targetRoute) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL(targetRoute, nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|ThinkNEXT-LOGO-NEW.svg).*)',
  ],
};
