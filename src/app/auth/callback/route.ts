import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeBuyer } from '@/lib/resend'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const isNewUser = searchParams.get('new') === '1'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (isNewUser && data.user?.email) {
        sendWelcomeBuyer({
          to: data.user.email,
          name: data.user.email.split('@')[0],
        }).catch(() => null)
        // Always send new users through onboarding
        return NextResponse.redirect(`${appUrl}/onboarding`)
      }
      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
