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
const ONBOARDING_BYPASS = ['/auth/', '/onboarding', '/api/', '/_next/', '/favicon', '/admin', '/ref/']

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

const GATE_TIMEOUT_MS = 3000

/**
 * Ensures a logged-in user has completed onboarding before accessing the app.
 * Fast path: pc_onboarded cookie skips the DB query.
 * Returns a redirect to /onboarding if incomplete, null otherwise.
 * Fails open on timeout or error so a slow Supabase response never blocks page load.
 */
async function onboardingGate(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  if (ONBOARDING_BYPASS.some(p => pathname.startsWith(p))) return null
  if (request.cookies.get('pc_onboarded')?.value === '1') return null

  try {
    const result = await Promise.race([
      checkOnboarding(request),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), GATE_TIMEOUT_MS)),
    ])

    if (result === 'timeout' || result === 'pass') return null

    if (result === 'redirect') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // result === 'stamp': onboarding complete, set cookie
    response.cookies.set('pc_onboarded', '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
  } catch {
    // Fail open — never block a page load due to a Supabase error
  }

  return null
}

async function checkOnboarding(request: NextRequest): Promise<'pass' | 'redirect' | 'stamp'> {
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

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.user) return 'pass'

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single()

  if (profileError) return 'pass' // DB error — fail open

  if (!profile?.onboarding_completed) return 'redirect'

  return 'stamp'
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
    const response = await updateSession(request).catch(() => NextResponse.next())
    return (await onboardingGate(request, response)) ?? response
  }

  const onAppDomain       = isAppDomain(request)
  const onMarketingDomain = isMarketingDomain(request)
  const loggedIn          = hasSession(request)

  // ── On pedigreecoins.com ──────────────────────────────────────────────────
  if (onMarketingDomain) {
    // pedigreecoins.com is STRICTLY the marketing landing page.
    // Only these paths are served here — everything else (including /auth/*)
    // is redirected to my.pedigreecoins.com so auth always happens on the app domain.
    const MARKETING_SERVE_PATHS = ['/', '/pricing', '/terms', '/privacy', '/ref/']
    const isMarketingPath = MARKETING_SERVE_PATHS.some(p =>
      p === '/' ? pathname === '/' : pathname.startsWith(p)
    )

    if (!isMarketingPath) {
      const target = new URL(pathname, APP_URL)
      if (request.nextUrl.search) target.search = request.nextUrl.search
      return NextResponse.redirect(target)
    }

    // Serve marketing paths without session processing — never show auth state here
    return NextResponse.next()
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
    const response = await updateSession(request).catch(() => NextResponse.next())
    return (await onboardingGate(request, response)) ?? response
  }

  // Unknown domain (e.g. Vercel preview URLs) — refresh session + onboarding gate
  const response = await updateSession(request).catch(() => NextResponse.next())
  return (await onboardingGate(request, response)) ?? response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
