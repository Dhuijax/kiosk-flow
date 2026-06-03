import { NextResponse, NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Extract subdomain (e.g. tenant1.localhost:3000 -> tenant1)
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
  
  let subdomain = '';
  if (hostname.endsWith(baseDomain) && hostname !== baseDomain) {
    subdomain = hostname.replace(`.${baseDomain}`, '');
  }

  if (subdomain) {
    request.headers.set('x-tenant-id', subdomain);
  }

  // Auth protection for business routes
  const protectedPaths = ['/dashboard', '/pos', '/kitchen'];
  
  // Strip locale prefix to correctly match protected paths (e.g. /vi/dashboard -> /dashboard)
  const pathnameWithoutLocale = url.pathname.replace(/^\/(vi|en)/, '');
  const isProtected = protectedPaths.some(path => pathnameWithoutLocale.startsWith(path) || url.pathname.startsWith(path));
  const isLoginPage = pathnameWithoutLocale.startsWith('/auth/login') || url.pathname.startsWith('/auth/login');

  if (isProtected) {
    const token = request.cookies.get('auth_token');
    
    if (!token) {
      // Redirect to login if trying to access protected route without token
      const match = url.pathname.match(/^\/(vi|en)/);
      const locale = match ? match[1] : 'vi';
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect to dashboard if already logged in and trying to access login page
  if (isLoginPage) {
    const token = request.cookies.get('auth_token');
    if (token) {
      const match = url.pathname.match(/^\/(vi|en)/);
      const locale = match ? match[1] : 'vi';
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  // Run next-intl middleware for locale routing
  const response = intlMiddleware(request);

  if (subdomain) {
    response.headers.set('x-tenant-id', subdomain);
  }

  return response;
}

export const config = {
  // Match all pathnames except for internal Next.js/PWA paths and static files
  matcher: ['/((?!api|_next|_vercel|manifest.json|icon-|pwa-|.*\\..*).*)']
};

