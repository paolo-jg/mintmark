import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import stripe from '@/lib/stripe'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  // 1. Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServiceDb()

  try {
    // 2. Fetch existing profile
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single()

    let accountId = profile?.stripe_account_id as string | null

    // 3. Create Express account if one doesn't exist yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { user_id: user.id },
      })

      accountId = account.id

      await db
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id)
    }

    // 4. Check if the account is already fully verified in Stripe
    const stripeAccount = await stripe.accounts.retrieve(accountId)
    const isComplete = stripeAccount.details_submitted === true && stripeAccount.payouts_enabled === true

    if (isComplete) {
      // Sync completion status to DB in case the return webhook missed it
      await db
        .from('profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('id', user.id)

      // Return a Stripe Express Dashboard login link so they can manage their account
      const loginLink = await stripe.accounts.createLoginLink(accountId)
      return NextResponse.json({ url: loginLink.url, alreadyComplete: true })
    }

    // 5. Generate a fresh onboarding link for incomplete accounts
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/stripe/connect/refresh?account=${accountId}`,
      return_url: `${baseUrl}/api/stripe/connect/return?account=${accountId}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe/connect/create]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
