import { handlers } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

interface HeadersWithGetSetCookie {
  getSetCookie(): string[];
}

export async function POST(req: NextRequest) {
  // 1. Clone request to check rememberMe body parameter without consuming the stream
  const clone = req.clone();
  let rememberMe = true; // Default to persistent session
  let isCredentialsLogin = false;

  try {
    const pathname = req.nextUrl.pathname;
    if (pathname.includes('/callback/credentials')) {
      isCredentialsLogin = true;
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await clone.json();
        if (body && 'rememberMe' in body) {
          rememberMe = body.rememberMe === true || body.rememberMe === 'true';
        }
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await clone.formData();
        const rememberMeValue = formData.get('rememberMe');
        if (rememberMeValue !== null) {
          rememberMe = rememberMeValue === 'true' || rememberMeValue === 'on';
        }
      }
    }
  } catch {
    // Ignore parsing issues
  }

  // 2. Call NextAuth native POST handler
  const response = await handlers.POST(req);

  // 3. Inspect and modify Set-Cookie headers if necessary
  const setCookie = (response.headers as unknown as HeadersWithGetSetCookie).getSetCookie?.() || [];
  if (setCookie && setCookie.length > 0) {
    const newHeaders = new Headers(response.headers);
    newHeaders.delete('set-cookie');

    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const isSignOut = req.nextUrl.pathname.includes('/signout');

    let isRememberMeActive = rememberMe;

    if (isSignOut) {
      // Clear remember-me-preference cookie immediately on logout
      newHeaders.append('set-cookie', `remember-me-preference=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${secureFlag}`);
    } else if (isCredentialsLogin) {
      // Set helper preference cookie during sign-in
      if (rememberMe) {
        newHeaders.append('set-cookie', `remember-me-preference=true; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secureFlag}`);
      } else {
        newHeaders.append('set-cookie', `remember-me-preference=false; Path=/; HttpOnly; SameSite=Lax${secureFlag}`);
      }
    } else {
      // Read preference cookie for standard/refresh requests
      const helperCookieValue = req.cookies.get('remember-me-preference')?.value;
      if (helperCookieValue === 'false') {
        isRememberMeActive = false;
      }
    }

    setCookie.forEach((cookie: string) => {
      const isSessionTokenCookie = cookie.startsWith('authjs.session-token=') || 
                                   cookie.startsWith('__Secure-authjs.session-token=') ||
                                   cookie.startsWith('next-auth.session-token=') ||
                                   cookie.startsWith('__Secure-next-auth.session-token=');

      const isDeleteCookie = cookie.toLowerCase().includes('max-age=0') || 
                             cookie.toLowerCase().includes('expires=thu, 01 jan 1970');

      if (isSessionTokenCookie && !isRememberMeActive && !isDeleteCookie) {
        // Strip Max-Age and Expires to make it a session-only cookie
        const cleanedCookie = cookie
          .replace(/Max-Age=\d+;?/gi, '')
          .replace(/Expires=[^;]+;?/gi, '')
          .replace(/;\s*;/g, ';');
        newHeaders.append('set-cookie', cleanedCookie);
      } else {
        newHeaders.append('set-cookie', cookie);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  return response;
}

export async function GET(req: NextRequest) {
  // 1. Call NextAuth native GET handler
  const response = await handlers.GET(req);

  // 2. Modify Set-Cookie if the session-only preference is active
  const helperCookieValue = req.cookies.get('remember-me-preference')?.value;
  if (helperCookieValue === 'false') {
    const setCookie = (response.headers as unknown as HeadersWithGetSetCookie).getSetCookie?.() || [];
    if (setCookie && setCookie.length > 0) {
      const newHeaders = new Headers(response.headers);
      newHeaders.delete('set-cookie');

      setCookie.forEach((cookie: string) => {
        const isSessionTokenCookie = cookie.startsWith('authjs.session-token=') || 
                                     cookie.startsWith('__Secure-authjs.session-token=') ||
                                     cookie.startsWith('next-auth.session-token=') ||
                                     cookie.startsWith('__Secure-next-auth.session-token=');

        const isDeleteCookie = cookie.toLowerCase().includes('max-age=0') || 
                               cookie.toLowerCase().includes('expires=thu, 01 jan 1970');

        if (isSessionTokenCookie && !isDeleteCookie) {
          // Strip Max-Age and Expires to make it a session-only cookie
          const cleanedCookie = cookie
            .replace(/Max-Age=\d+;?/gi, '')
            .replace(/Expires=[^;]+;?/gi, '')
            .replace(/;\s*;/g, ';');
          newHeaders.append('set-cookie', cleanedCookie);
        } else {
          newHeaders.append('set-cookie', cookie);
        }
      });

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
  }

  return response;
}
