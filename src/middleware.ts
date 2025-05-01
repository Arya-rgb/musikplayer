
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// List of public paths that don't require authentication
const PUBLIC_FILE = /\.(.*)$/; // Files (like images) in the public folder
const PUBLIC_PATHS = ['/login']; // Login is the only public route

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
    // If user is authenticated and tries to access login page, redirect to home
    if (sessionCookie && pathname === '/login') {
       return NextResponse.redirect(new URL('/', request.url));
    }
    // Otherwise, allow access to public path
    return NextResponse.next();
  }

  // If trying to access a protected route without a session, redirect to login
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    // Optionally add the intended destination as a query parameter for future use,
    // but the login page currently always redirects to '/'
    // loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow the request to proceed if authenticated and accessing a protected route
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
     * Apply to the root path ('/') and login ('/login') and any other potential paths.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
