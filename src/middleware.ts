import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'

// Paths that bypass the onboarding gate entirely
const BYPASS_PREFIXES = [
  '/auth/',
  '/onboarding',
  '/api/',
  '/_next/',
  '/favicon',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always refresh the Supabase session first
  const response = await updateSession(request)

  // Let auth pages, API routes, and onboarding through unconditionally
  if (BYPASS_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return response
  }

  // Fast path: cookie already set means onboarding is done — no DB query
  if (request.cookies.get('pc_onboarded')?.value === '1') {
    return response
  }

  // Need to determine onboarding status — create a read-only Supabase client
  // (cookies are already being managed by updateSession above)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}, // handled by updateSession
      },
    }
  )

  // getSession reads from cookie — no network round-trip
  const { data: { session } } = await supabase.auth.getSession()

  // Not logged in — pages handle their own auth redirects
  if (!session?.user) return response

  // Logged in but no onboarding cookie — check the DB once
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single()

  if (!profile?.onboarding_completed) {
    // Block access and send to onboarding
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Onboarding complete — stamp the cookie so we skip the DB query from now on
  response.cookies.set('pc_onboarded', '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images.
     * updateSession needs to run on every dynamic route to keep the session fresh.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
