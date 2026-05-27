import { type NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import stripe from '@/lib/stripe'
import { sendWelcomeSeller } from '@/lib/resend'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get('account')

  if (!accountId) {
    return NextResponse.redirect(new URL('/sell', req.nextUrl.origin))
  }

  try {
    // Retrieve the account from Stripe to check onboarding status
    const account = await stripe.accounts.retrieve(accountId)

    const isComplete =
      account.details_submitted &&
      !account.requirements?.currently_due?.length

    if (isComplete) {
      const db = getServiceDb()
      const { data: profile } = await db
        .from('profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('stripe_account_id', accountId)
        .select('id')
        .single()

      if (profile?.id) {
        db.auth.admin.getUserById(profile.id).then(({ data }) => {
          const email = data.user?.email
          if (email) {
            sendWelcomeSeller({ to: email, name: email.split('@')[0] }).catch(() => null)
          }
        }).catch(() => null)
      }
    }

    const baseUrl = req.nextUrl.origin
    const destination = isComplete
      ? `${baseUrl}/sell?onboarded=1`
      : `${baseUrl}/sell?onboarding=incomplete`

    return NextResponse.redirect(destination)
  } catch (err) {
    console.error('[stripe/connect/return]', err)
    return NextResponse.redirect(new URL('/sell', req.nextUrl.origin))
  }
}
