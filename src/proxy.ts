import { type NextRequest, NextResponse } from 'next/server'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL ?? 'http://localhost:3000'
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL       ?? 'http://localhost:3000'

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Static assets and API routes — pass through immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Local dev — no subdomain logic, just pass through
  if (isLocalDev(request)) {
    return NextResponse.next()
  }

  const onAppDomain       = isAppDomain(request)
  const onMarketingDomain = isMarketingDomain(request)
  const loggedIn          = hasSession(request)

  // ── On www.pedigreecoins.com ──────────────────────────────────────────────
  if (onMarketingDomain) {
    // Signed-in users don't belong on non-auth marketing pages → send to app
    if (loggedIn) {
      const isAuthRoute = MARKETING_ONLY_PATHS.includes(pathname)
      if (!isAuthRoute) {
        return NextResponse.redirect(new URL(pathname, APP_URL))
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

    return NextResponse.next()
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
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
