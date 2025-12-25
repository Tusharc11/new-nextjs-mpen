import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import { hasAccess, getFirstAllowedRoute } from './lib/role';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/api/auth/login', '/api/auth/refresh', '/images', '/access-denied'];

// Define cron routes that use simple token authentication
const cronRoutes = ['/api/cron/process-late-fees'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Handle cron routes with simple token authentication
  if (cronRoutes.some(route => pathname.startsWith(route))) {
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET || 'mayank';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.next();
  }
  
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');
  
  // No token found
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify token and get user data
    const userData = await verifyToken(token);

    if (!userData) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check if user has access to the requested route
    if (!hasAccess(userData.role, pathname)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden', message: 'You do not have permission to access this resource' }, { status: 403 });
      }
      // Redirect to the first allowed route for this user's role
      const firstAllowedRoute = getFirstAllowedRoute(userData.role);
      return NextResponse.redirect(new URL(firstAllowedRoute, request.url));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('user', JSON.stringify(userData));
    
    // For API routes, ensure Authorization header is set
    if (pathname.startsWith('/api/')) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    return NextResponse.next({
      headers: requestHeaders,
    });
  } catch (error) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)',
  ],
};
