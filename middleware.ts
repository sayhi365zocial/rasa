import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/api/auth/login']
const AUTH_ROUTES = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Get token from cookie
  const token = request.cookies.get('authToken')?.value

  // Redirect to login if no token (for page routes only, not API)
  if (!token && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For API routes without token, let the API handle the 401
  if (!token && pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Note: JWT verification moved to getCurrentUser() in lib/auth/session.ts
  // to avoid Edge Runtime compatibility issues with jsonwebtoken library

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
