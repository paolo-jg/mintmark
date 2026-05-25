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

    // Save account ID immediately so we don't create duplicates on retry
    await db
      .from('profiles')
      .update({ stripe_account_id: accountId })
      .eq('id', user.id)
  }

  // 4. Generate a fresh onboarding link (links expire after a few minutes)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/api/stripe/connect/refresh?account=${accountId}`,
    return_url: `${baseUrl}/api/stripe/connect/return?account=${accountId}`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
