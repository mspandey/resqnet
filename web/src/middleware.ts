import { NextRequest, NextResponse } from 'next/server';

/**
 * middleware.ts
 * Route-gating by role.
 * Reads the JWT from the Authorization cookie (set on login).
 * This is a UX guard — real enforcement is at the API Gateway (WEBFLOW.md §4).
 */

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/user',
  '/user/login',
  '/user/signup',
  '/citizen',
  '/citizen/login',
  '/citizen/signup',
  '/volunteer',
  '/volunteer/login',
  '/volunteer/signup',
  '/authority',
  '/authority/login',
  '/authority/signup',
  '/admin',
  '/admin/login',
  '/admin/signup',
];

const ROLE_PREFIXES: Record<string, string> = {
  citizen: '/citizen',
  volunteer: '/volunteer',
  rescue_team: '/rescue',
  authority: '/authority',
  admin: '/admin',
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const role = req.cookies.get('resqnet_role')?.value;
  const token = req.cookies.get('resqnet_token')?.value;

  // Not logged in — redirect to login
  if (!token || !role) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Enforce role prefix
  const allowedPrefix = ROLE_PREFIXES[role];
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL(allowedPrefix, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
