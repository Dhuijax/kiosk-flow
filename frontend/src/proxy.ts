import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Extract subdomain (e.g. tenant1.localhost:3000 -> tenant1)
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
  
  let subdomain = '';
  if (hostname.endsWith(baseDomain) && hostname !== baseDomain) {
    subdomain = hostname.replace(`.${baseDomain}`, '');
  }

  const response = NextResponse.next();
  if (subdomain) {
    response.headers.set('x-tenant-id', subdomain);
    request.headers.set('x-tenant-id', subdomain);
  }

  // Auth protection for business routes
  const protectedPaths = ['/dashboard', '/pos', '/kitchen'];
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));
  const isLoginPage = url.pathname.startsWith('/auth/login');

  if (isProtected) {
    const token = request.cookies.get('auth_token');
    
    if (!token) {
      // Redirect to login if trying to access protected route without token
      const loginUrl = new URL('/auth/login', request.url);
      // Store the original destination to redirect back after login
      loginUrl.searchParams.set('callbackUrl', url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect to dashboard if already logged in and trying to access login page
  if (isLoginPage) {
    const token = request.cookies.get('auth_token');
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
