import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL ?? 'http://localhost:3000'
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL       ?? 'http://localhost:3000'

const MARKETING_ONLY_PATHS = ['/', '/pricing', '/auth/login', '/auth/register', '/auth/callback']
const APP_ONLY_PATHS = ['/sell', '/collect', '/listings', '/buy-now', '/auctions', '/profile', '/dealers', '/orders', '/dashboard']

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

async function getUser(req: NextRequest) {
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
  return data.user
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Local dev: skip subdomain logic, just run session refresh + route protection
  if (isLocalDev(request)) {
    return updateSession(request)
  }

  const onAppDomain      = isAppDomain(request)
  const onMarketingDomain = isMarketingDomain(request)
  const user             = await getUser(request)

  // ── On pedigreecoins.com ──────────────────────────────────────────────────
  if (onMarketingDomain) {
    if (user) {
      const isAuthRoute = MARKETING_ONLY_PATHS.includes(pathname)
      if (!isAuthRoute) {
        return NextResponse.redirect(new URL(pathname, APP_URL))
      }
    }

    const isAppPath = APP_ONLY_PATHS.some(p => pathname.startsWith(p))
    if (isAppPath) {
      if (!user) {
        return NextResponse.redirect(new URL(`/auth/login?redirectTo=${pathname}`, MARKETING_URL))
      }
      return NextResponse.redirect(new URL(pathname, APP_URL))
    }

    return updateSession(request)
  }

  // ── On my.pedigreecoins.com ───────────────────────────────────────────────
  if (onAppDomain) {
    if (!user) {
      const isPublicPath = pathname.startsWith('/auth')
      if (!isPublicPath) {
        return NextResponse.redirect(
          new URL(`/auth/login?redirectTo=${pathname}`, MARKETING_URL)
        )
      }
    }

    const isMarketingPath = MARKETING_ONLY_PATHS.includes(pathname)
    if (isMarketingPath && pathname !== '/auth/login' && pathname !== '/auth/register') {
      return NextResponse.redirect(new URL(pathname, MARKETING_URL))
    }

    return updateSession(request)
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
