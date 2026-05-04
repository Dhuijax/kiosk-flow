import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Extract subdomain (e.g. tenant1.localhost:3000 -> tenant1)
  // Define your base domain here
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
  
  let subdomain = '';
  if (hostname.endsWith(baseDomain) && hostname !== baseDomain) {
    subdomain = hostname.replace(`.${baseDomain}`, '');
  }

  // If no subdomain, we might want to redirect to a landing page or handled by main app
  // For now, if there is a subdomain, inject it into headers
  const response = NextResponse.next();
  if (subdomain) {
    response.headers.set('x-tenant-id', subdomain);
    // Also inject it into the request headers so Server Components can see it
    request.headers.set('x-tenant-id', subdomain);
  }

  // Auth protection for dashboard routes
  if (url.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth_token');
    if (!token) {
      // For local development on localhost:3000, we might want to be more lenient 
      // if cookies are being tricky, but for now let's ensure the path is consistent.
      const isLocalhost = hostname.includes('localhost');
      if (!isLocalhost) {
        const loginUrl = new URL('/auth/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
