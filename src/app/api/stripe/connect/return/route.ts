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
    const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ?? false

    let isComplete: boolean
    if (isLiveMode) {
      // Production: verify KYC is fully cleared with Stripe
      const account = await stripe.accounts.retrieve(accountId)
      isComplete = account.details_submitted === true && account.payouts_enabled === true
    } else {
      // Test mode: trust that Stripe returned the user — skip API check entirely
      // (details_submitted and payouts_enabled are unreliable with dummy test data)
      isComplete = true
    }

    if (isComplete) {
      const db = getServiceDb()

      // Try to find profile by stripe_account_id first
      let { data: profile, error: dbError } = await db
        .from('profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('stripe_account_id', accountId)
        .select('id')
        .single()

      // Fallback: if no row matched (stripe_account_id not saved yet), look up via
      // Stripe account metadata which stores the user_id at account creation time
      if (!profile?.id) {
        const account = await stripe.accounts.retrieve(accountId)
        const userId = account.metadata?.user_id
        if (userId) {
          const fallback = await db
            .from('profiles')
            .update({ stripe_account_id: accountId, stripe_onboarding_complete: true })
            .eq('id', userId)
            .select('id')
            .single()
          if (fallback.error) console.error('[stripe/connect/return] fallback update failed:', fallback.error.message)
          else profile = fallback.data
        } else {
          if (dbError) console.error('[stripe/connect/return] db update failed:', dbError.message)
        }
      }

      if (profile?.id) {
        db.auth.admin.getUserById(profile.id).then(({ data }) => {
          const email = data.user?.email
          if (email) {
            sendWelcomeSeller({ to: email, name: email.split('@')[0] })
              .catch(err => console.error('[resend] seller welcome email failed:', err))
          }
        }).catch(err => console.error('[stripe/connect/return] getUserById failed:', err))
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
