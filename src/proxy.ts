import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL       || 'http://localhost:3000'

// Paths served on the marketing domain (pedigreecoins.com)
const MARKETING_ONLY_PATHS = ['/', '/pricing', '/auth/login', '/auth/register', '/auth/callback', '/privacy', '/terms']
// Paths that require auth and belong on the app domain (my.pedigreecoins.com)
const APP_ONLY_PATHS = ['/sell', '/collect', '/listings', '/buy-now', '/auctions', '/profile', '/dealers', '/orders', '/dashboard']
// Paths accessible on both domains without auth
const PUBLIC_PATHS = ['/privacy', '/terms']

// Paths that bypass the onboarding gate
const ONBOARDING_BYPASS = ['/auth/', '/onboarding', '/api/', '/_next/', '/favicon']

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
 */
function hasSession(req: NextRequest): boolean {
  return req.cookies.getAll().some(c =>
    c.name.includes('-auth-token') && c.value.length > 0
  )
}

/**
 * Ensures a logged-in user has completed onboarding before accessing the app.
 * Fast path: pc_onboarded cookie skips the DB query.
 * Returns a redirect to /onboarding if incomplete, null otherwise.
 */
async function onboardingGate(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  if (ONBOARDING_BYPASS.some(p => pathname.startsWith(p))) return null
  if (request.cookies.get('pc_onboarded')?.value === '1') return null

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single()

  if (!profile?.onboarding_completed) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Stamp cookie so we skip the DB query from now on
  response.cookies.set('pc_onboarded', '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  return null
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

  // Local dev — no subdomain logic, just refresh session + onboarding gate
  if (isLocalDev(request)) {
    const response = await updateSession(request)
    return (await onboardingGate(request, response)) ?? response
  }

  const onAppDomain       = isAppDomain(request)
  const onMarketingDomain = isMarketingDomain(request)
  const loggedIn          = hasSession(request)

  // ── On pedigreecoins.com ──────────────────────────────────────────────────
  if (onMarketingDomain) {
    // Validate/refresh the session first so stale tokens are cleared before
    // we make any routing decisions based on hasSession().
    const marketingResponse = await updateSession(request)

    if (loggedIn) {
      // Always keep the landing page and marketing-only paths on this domain —
      // avoids a redirect loop when session cookies are stale/expired.
      const stayOnMarketing =
        pathname === '/' ||
        pathname.startsWith('/auth') ||
        pathname === '/privacy' ||
        pathname === '/terms' ||
        pathname === '/pricing'
      if (!stayOnMarketing) {
        return NextResponse.redirect(new URL(pathname, APP_URL))
      }
    }

    const isAppPath = APP_ONLY_PATHS.some(p => pathname.startsWith(p))
    if (isAppPath) {
      if (!loggedIn) {
        return NextResponse.redirect(new URL(`/auth/login?redirectTo=${pathname}`, MARKETING_URL))
      }
      return NextResponse.redirect(new URL(pathname, APP_URL))
    }

    return marketingResponse
  }

  // ── On my.pedigreecoins.com ───────────────────────────────────────────────
  if (onAppDomain) {
    if (!loggedIn) {
      const isPublicPath = pathname.startsWith('/auth') || PUBLIC_PATHS.includes(pathname)
      if (!isPublicPath) {
        return NextResponse.redirect(
          new URL(`/auth/login?redirectTo=${pathname}`, MARKETING_URL)
        )
      }
    }
    const response = await updateSession(request)
    return (await onboardingGate(request, response)) ?? response
  }

  // Unknown domain (e.g. Vercel preview URLs) — refresh session + onboarding gate
  const response = await updateSession(request)
  return (await onboardingGate(request, response)) ?? response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
