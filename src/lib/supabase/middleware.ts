import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// In production, share cookies across all subdomains (pedigreecoins.com + my.pedigreecoins.com)
// In dev, leave undefined so cookies default to localhost
function getCookieDomain(): string | undefined {
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL
  if (!marketingUrl) return undefined
  try {
    const host = new URL(marketingUrl).hostname
    // Skip localhost / IP addresses
    if (host === 'localhost' || host.startsWith('127.') || host.startsWith('192.')) return undefined
    // Strip www. prefix so the cookie covers ALL subdomains (www. + my. + bare domain)
    const base = host.replace(/^www\./, '')
    return `.${base}`
  } catch {
    return undefined
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const cookieDomain = getCookieDomain()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          )
        },
      },
    }
  )

  // getSession reads from cookie — no network round-trip (fast)
  // Route protection is handled by the proxy at the subdomain level, not here
  await supabase.auth.getSession()

  return supabaseResponse
}
