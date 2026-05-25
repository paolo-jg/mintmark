import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL ?? 'http://localhost:3000'
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL       ?? 'http://localhost:3000'

// Routes that belong only on the marketing domain (pedigreecoins.com)
const MARKETING_ONLY_PATHS = ['/', '/pricing', '/auth/login', '/auth/register', '/auth/callback']

// Routes that belong only on the app domain (my.pedigreecoins.com)
const APP_ONLY_PATHS = ['/sell', '/collect', '/listings', '/buy-now', '/auctions', '/profile', '/dealers', '/orders', '/dashboard']

function isAppDomain(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const appHost = new URL(APP_URL).host
  return host === appHost
}

function isMarketingDomain(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const marketingHost = new URL(MARKETING_URL).host
  // In dev both are localhost so always treat as marketing domain for base behaviour
  return host === marketingHost
}

function isLocalDev(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
}

async function getUser(req: NextRequest) {
  let user = null
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data } = await supabase.auth.getUser()
  user = data.user
  return user
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // In local dev: skip subdomain logic, just run session refresh + route protection
  if (isLocalDev(req)) {
    return updateSession(req)
  }

  const onAppDomain      = isAppDomain(req)
  const onMarketingDomain = isMarketingDomain(req)
  const user             = await getUser(req)

  // ── On pedigreecoins.com ───────────────────────────────────────────────────
  if (onMarketingDomain) {
    // Signed-in user hits marketing domain → send to app
    if (user) {
      // Allow auth routes to stay on marketing domain (post-login callback etc.)
      const isAuthRoute = MARKETING_ONLY_PATHS.includes(pathname)
      if (!isAuthRoute) {
        return NextResponse.redirect(new URL(pathname, APP_URL))
      }
    }

    // App-only path hit on marketing domain (e.g. someone typed pedigreecoins.com/sell)
    const isAppPath = APP_ONLY_PATHS.some(p => pathname.startsWith(p))
    if (isAppPath) {
      if (!user) {
        return NextResponse.redirect(new URL(`/auth/login?redirectTo=${pathname}`, MARKETING_URL))
      }
      return NextResponse.redirect(new URL(pathname, APP_URL))
    }

    return updateSession(req)
  }

  // ── On my.pedigreecoins.com ────────────────────────────────────────────────
  if (onAppDomain) {
    // Signed-out user hits app domain → send to marketing login
    if (!user) {
      // Allow API routes through (webhooks, etc.)
      const isPublicAppPath =
        pathname.startsWith('/api') ||
        pathname.startsWith('/auth')

      if (!isPublicAppPath) {
        return NextResponse.redirect(
          new URL(`/auth/login?redirectTo=${pathname}`, MARKETING_URL)
        )
      }
    }

    // Marketing-only paths on app domain → redirect to marketing
    const isMarketingPath = MARKETING_ONLY_PATHS.includes(pathname)
    if (isMarketingPath && pathname !== '/auth/login' && pathname !== '/auth/register') {
      return NextResponse.redirect(new URL(pathname, MARKETING_URL))
    }

    return updateSession(req)
  }

  return updateSession(req)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
