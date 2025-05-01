
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// List of public paths that don't require authentication
const PUBLIC_FILE = /\.(.*)$/; // Files (like images) in the public folder
// No explicit public paths needed anymore, as root is now accessible by default.
// const PUBLIC_PATHS = ['/login']; // Login is now handled via modal usually

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('firebaseIdToken'); // Adjust cookie name if necessary

  // --- Rule 1: Allow access to public files and specific Next.js internals ---
  if (
    pathname.startsWith('/_next') || // Allow Next.js internal paths
    pathname.startsWith('/api') || // Allow API routes (adjust if some need protection)
    pathname.startsWith('/static') || // Allow static files
    PUBLIC_FILE.test(pathname) // Allow public files
    // pathname === '/login' // Remove this if /login page is deleted in favor of modal
  ) {
    console.log(`Middleware: Allowing access to internal/public path: ${pathname}`);
    return NextResponse.next();
  }

  // --- Rule 2: Handle Authentication State (Optional - Primarily handled client-side now) ---
  // This middleware now primarily focuses on allowing access.
  // Authentication checks and conditional rendering/UI changes (like showing Login button)
  // are handled client-side by AuthProvider and components.
  // If there were specific server-side protected routes *other* than the main app view,
  // you might add checks here.

  console.log(`Middleware: Allowing access to route: ${pathname} (Auth handled client-side)`);
  return NextResponse.next();

  /* --- OLD LOGIC (REMOVED) ---
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
    return NextResponse.redirect(loginUrl);
  }

  // --- Rule 4: Allow authenticated users access to protected routes ---
  console.log(`Middleware: Authenticated user accessing protected route ${pathname}, allowing.`);
  return NextResponse.next();
  */
}

// Define the paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * This ensures the middleware runs on pages like '/' but skips asset requests.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

