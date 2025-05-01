
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// List of public paths that don't require authentication
const PUBLIC_FILE = /\.(.*)$/; // Files (like images) in the public folder
const PUBLIC_PATHS = ['/login']; // Add any other public paths here

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('firebaseIdToken'); // Adjust cookie name if necessary

  // Allow access to public files and defined public paths
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') || // Allow Next.js internal paths
    pathname.startsWith('/api') || // Allow API routes (adjust if some need protection)
    pathname.startsWith('/static') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // If trying to access a protected route without a session, redirect to login
  if (!sessionCookie && !PUBLIC_PATHS.includes(pathname)) {
    const loginUrl = new URL('/login', request.url);
    // Optionally add the intended destination as a query parameter
    // loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and tries to access login page, redirect to home
  if (sessionCookie && pathname === '/login') {
     return NextResponse.redirect(new URL('/', request.url));
  }


  // Allow the request to proceed if authenticated or accessing a public path
  return NextResponse.next();
}

// Define the paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - Handled explicitly above if needed
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * But apply to the root path ('/') and login ('/login').
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
     '/',
     '/login',
  ],
};
