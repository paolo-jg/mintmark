import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import stripe from '@/lib/stripe'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const PRICE_IDS: Record<string, string | undefined> = {
  collector_premium: process.env.STRIPE_PRICE_PREMIUM,
  dealer: process.env.STRIPE_PRICE_DEALER,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier, return_url } = await req.json() as { tier: string; return_url?: string }

  const priceId = PRICE_IDS[tier]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const db = getServiceDb()

  const [{ data: profile }, { data: referralRecord }] = await Promise.all([
    db.from('profiles')
      .select('stripe_customer_id, email, subscription_free_until, subscription_credit_months')
      .eq('id', user.id)
      .single(),
    db.from('referrals')
      .select('id')
      .eq('referred_id', user.id)
      .maybeSingle(),
  ])

  let customerId = profile?.stripe_customer_id as string | null
  const isNewCustomer = !customerId

  if (!customerId) {
    const { data: authUser } = await db.auth.admin.getUserById(user.id)
    const customer = await stripe.customers.create({
      email: authUser.user?.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await db.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  // Determine trial days:
  // 1. Active referral credit → 30 days (consumes the credit)
  // 2. Ever received referral credit (as referee or referrer) → no trial
  // 3. Never subscribed before → 14-day trial
  // 4. Returning subscriber → no trial
  const freeUntilRaw = profile?.subscription_free_until as string | null
  const hasFreeMonth = freeUntilRaw ? new Date(freeUntilRaw).getTime() > Date.now() : false
  const hasReferralHistory = !!referralRecord || (profile?.subscription_credit_months ?? 0) > 0

  let trialDays = 0
  if (hasFreeMonth) {
    trialDays = 30
  } else if (!hasReferralHistory) {
    if (isNewCustomer) {
      trialDays = 14
    } else {
      const prior = await stripe.subscriptions.list({ customer: customerId, limit: 1, status: 'all' })
      if (prior.data.length === 0) trialDays = 14
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const baseSuccess = new URL(return_url ?? '/sell', appUrl || 'http://localhost:3000')
  baseSuccess.searchParams.set('upgraded', '1')
  const successUrl = baseSuccess.toString()

  // Consume referral credit so it can't be reused on a future subscription
  if (hasFreeMonth) {
    await db.from('profiles').update({ subscription_free_until: null }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: `${appUrl}${return_url ?? '/sell'}`,
    metadata: {
      supabase_user_id: user.id,
      target_tier: tier,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        target_tier: tier,
      },
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
    },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
