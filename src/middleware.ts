import { updateSession } from '@/lib/supabase/middleware'
import { proxy } from '@/proxy'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const proxyResponse = proxy(request)
  // If proxy issued a redirect, honour it immediately
  if (proxyResponse.status !== 200) return proxyResponse
  // Otherwise refresh the Supabase session cookie
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
