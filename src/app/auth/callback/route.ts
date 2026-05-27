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
    if (!error && data.user) {
      // Check onboarding status directly — more reliable than the new=1 param
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single()

      if (!profile?.onboarding_completed) {
        // First-time user: send welcome email if flagged as new, then onboard
        if (isNewUser && data.user.email) {
          sendWelcomeBuyer({
            to: data.user.email,
            name: data.user.email.split('@')[0],
          }).catch(() => null)
        }
        return NextResponse.redirect(`${appUrl}/onboarding`)
      }

      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
