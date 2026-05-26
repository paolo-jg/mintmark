import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL       || 'http://localhost:3000'

// Paths served on the marketing domain (pedigreecoins.com)
const MARKETING_ONLY_PATHS = ['/', '/pricing', '/auth/login', '/auth/register', '/auth/callback', '/privacy', '/terms']
// Paths that require auth and belong on the app domain (my.pedigreecoins.com)
const APP_ONLY_PATHS = ['/sell', '/collect', '/listings', '/buy-now', '/auctions', '/profile', '/dealers', '/orders', '/dashboard']
// Paths accessible on both domains without auth
const PUBLIC_PATHS = ['/privacy', '/terms']

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAppDomain(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  return host === new URL(APP_URL).host
}

function isMarketingDomain(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  return host === new URL(MARKETING_URL).host
}

function isLocalDev(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
}

/**
 * Lightweight session check — no Supabase SDK, no network calls.
 * Just looks for the Supabase auth token cookie in the request.
 * The browser client handles actual token refresh; the proxy only
 * needs to know "does a session exist" for routing decisions.
 */
function hasSession(req: NextRequest): boolean {
  return req.cookies.getAll().some(c =>
    c.name.includes('-auth-token') && c.value.length > 0
  )
}

// ── Proxy ─────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Static assets and API routes — pass through immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return updateSession(request)
  }

  // Local dev — no subdomain logic, just refresh session
  if (isLocalDev(request)) {
    return updateSession(request)
  }

  const onAppDomain       = isAppDomain(request)
  const onMarketingDomain = isMarketingDomain(request)
  const loggedIn          = hasSession(request)

  // ── On pedigreecoins.com ──────────────────────────────────────────────────
  if (onMarketingDomain) {
    // Signed-in users → send to app domain except for auth/legal/pricing
    if (loggedIn) {
      const stayOnMarketing = pathname.startsWith('/auth') || pathname === '/privacy' || pathname === '/terms' || pathname === '/pricing'
      if (!stayOnMarketing) {
        return NextResponse.redirect(new URL(pathname === '/' ? '/' : pathname, APP_URL))
      }
    }

    // App-only paths on marketing domain → redirect to app (or login if not signed in)
    const isAppPath = APP_ONLY_PATHS.some(p => pathname.startsWith(p))
    if (isAppPath) {
      if (!loggedIn) {
        return NextResponse.redirect(new URL(`/auth/login?redirectTo=${pathname}`, MARKETING_URL))
      }
      return NextResponse.redirect(new URL(pathname, APP_URL))
    }

    return updateSession(request)
  }

  // ── On my.pedigreecoins.com ───────────────────────────────────────────────
  if (onAppDomain) {
    // Unsigned users trying to access protected pages → send to login
    if (!loggedIn) {
      const isPublicPath = pathname.startsWith('/auth') || PUBLIC_PATHS.includes(pathname)
      if (!isPublicPath) {
        return NextResponse.redirect(
          new URL(`/auth/login?redirectTo=${pathname}`, MARKETING_URL)
        )
      }
    }
    return updateSession(request)
  }

  // Unknown domain (e.g. Vercel preview URLs) — just refresh session
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
