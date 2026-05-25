import { createBrowserClient } from '@supabase/ssr'

function getCookieDomain(): string | undefined {
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL
  if (!marketingUrl) return undefined
  try {
    const host = new URL(marketingUrl).hostname
    // Skip localhost / IP addresses — cookie domain scoping only works on real domains
    if (host === 'localhost' || host.startsWith('127.') || host.startsWith('192.')) return undefined
    // Strip www. prefix → ".pedigreecoins.com" shared across all subdomains
    const base = host.replace(/^www\./, '')
    return `.${base}`
  } catch {
    return undefined
  }
}

export function createClient() {
  const cookieDomain = getCookieDomain()
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain ? { cookieOptions: { domain: cookieDomain } } : undefined
  )
}
