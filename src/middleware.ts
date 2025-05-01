
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// List of public paths that don't require authentication
const PUBLIC_FILE = /\.(.*)$/; // Files (like images) in the public folder
const PUBLIC_PATHS = ['/login']; // Login is the only public route

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('firebaseIdToken'); // Adjust cookie name if necessary

  // --- Rule 1: Allow access to public files and specific Next.js internals ---
  if (
    pathname.startsWith('/_next') || // Allow Next.js internal paths
    pathname.startsWith('/api') || // Allow API routes (adjust if some need protection)
    pathname.startsWith('/static') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // --- Rule 2: Handle the Login Page ---
  if (pathname === '/login') {
    // If user is authenticated and tries to access login page, redirect to home
    if (sessionCookie) {
       console.log('Middleware: Authenticated user accessing /login, redirecting to /');
       return NextResponse.redirect(new URL('/', request.url));
    }
    // Otherwise (not authenticated), allow access to login page
    console.log('Middleware: Unauthenticated user accessing /login, allowing.');
    return NextResponse.next();
  }

  // --- Rule 3: Handle Protected Routes (everything else, including '/') ---
  // If trying to access a protected route without a session, redirect to login
  if (!sessionCookie) {
    console.log(`Middleware: Unauthenticated user accessing protected route ${pathname}, redirecting to /login`);
    const loginUrl = new URL('/login', request.url);
    // Optionally add the intended destination as a query parameter for future use,
    // but the login page currently always redirects to '/'
    // loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- Rule 4: Allow authenticated users access to protected routes ---
  console.log(`Middleware: Authenticated user accessing protected route ${pathname}, allowing.`);
  return NextResponse.next();
}

// Define the paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - Handled explicitly above
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * We need it to run on '/' and '/login' and potentially others.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
