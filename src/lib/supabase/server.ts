import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getCookieDomain(): string | undefined {
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL
  if (!marketingUrl) return undefined
  try {
    const host = new URL(marketingUrl).hostname
    if (host === 'localhost' || host.startsWith('127.') || host.startsWith('192.')) return undefined
    const base = host.replace(/^www\./, '')
    return `.${base}`
  } catch {
    return undefined
  }
}

export async function createClient() {
  const cookieStore = await cookies()
  const cookieDomain = getCookieDomain()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(cookieDomain ? { domain: cookieDomain } : {}),
              })
            )
          } catch {
            // Server component - cookies can't be set, middleware handles this
          }
        },
      },
    }
  )
}
